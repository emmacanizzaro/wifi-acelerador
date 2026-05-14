import {
    AceleratorInsightRecommendation,
    DeviceInfo,
    NetworkMetrics,
    ProcessUsage,
} from '../../shared/types/network';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, digits = 1): number {
  return Number(value.toFixed(digits))
}

export class AceleratorInsightsService {
  private smoothedPingMs: number | null = null
  private smoothedJitterMs: number | null = null
  private smoothedHealthScore: number | null = null
  private incidentStreak = 0

  analyze(input: {
    metrics: NetworkMetrics | null
    devices: DeviceInfo[]
    processes: ProcessUsage[]
  }): AceleratorInsightRecommendation[] {
    if (!input.metrics) {
      return [
        {
          id: 'boot-wait-metrics',
          level: 'info',
          title: 'Recolectando datos de red',
          message:
            'Acelerator Insights esta reuniendo informacion inicial para generar recomendaciones precisas.',
          createdAt: Date.now(),
        },
      ]
    }

    const { metrics, devices, processes } = input
    const heavyProcess = processes[0]
    const smoothed = this.updateSmoothedMetrics(metrics)
    const incidentScore = this.computeIncidentScore({
      metrics,
      smoothed,
      devicesCount: devices.length,
      heavyProcess,
    })
    const persistentIncident = this.updateIncidentStreak(incidentScore)
    const recommendations: AceleratorInsightRecommendation[] = []
    const now = Date.now()

    const uploadSaturation =
      metrics.uploadMbps <= 1.8 &&
      metrics.estimatedBandwidthUsageMbps >= 1.2 &&
      (heavyProcess?.estimatedUsageScore ?? 0) >= 7

    const upstreamLatency =
      smoothed.pingMs >= 92 &&
      smoothed.jitterMs <= 18 &&
      metrics.uploadMbps > 1.8 &&
      metrics.healthScore < 75

    const localContention =
      smoothed.jitterMs >= 20 &&
      (devices.length >= 10 || (heavyProcess?.estimatedUsageScore ?? 0) >= 10)

    const severeHealth = metrics.healthScore <= 36 || (incidentScore >= 75 && persistentIncident)

    if (severeHealth) {
      recommendations.push({
        id: 'router-restart',
        level: 'critical',
        title: 'Salud WiFi critica y sostenida',
        message:
          'La red mantiene degradacion severa en varias muestras consecutivas. Ejecuta limpieza inteligente ahora y revisa canal/interferencias del router.',
        suggestedAction: 'turbo_boost',
        createdAt: now,
      })
    }

    if (uploadSaturation) {
      recommendations.push({
        id: 'root-cause-upload-saturation',
        level: 'warning',
        title: 'Causa raiz: subida saturada',
        message:
          'La subida disponible es baja frente al uso observado y un proceso local esta empujando trafico de forma sostenida. Pausa sincronizaciones pesadas.',
        suggestedAction: 'turbo_boost',
        createdAt: now,
      })
    }

    if (upstreamLatency && persistentIncident) {
      recommendations.push({
        id: 'root-cause-upstream-latency',
        level: 'warning',
        title: 'Causa raiz: latencia aguas arriba',
        message:
          'El ping se mantiene alto con jitter controlado, patron tipico de congestion externa/ISP. Ejecuta speed test y compara por horario.',
        suggestedAction: 'speed_test',
        createdAt: now,
      })
    }

    if (localContention && persistentIncident) {
      recommendations.push({
        id: 'root-cause-device-contention',
        level: 'warning',
        title: 'Causa raiz: contencion por dispositivos',
        message:
          'El jitter alto coincide con muchos dispositivos/procesos activos, lo que indica contencion local. Segmenta IoT/invitados y prioriza dispositivos criticos.',
        suggestedAction: 'restart_adapter',
        createdAt: now,
      })
    }

    if ((metrics.pingMs > 82 || metrics.jitterMs > 22) && persistentIncident) {
      recommendations.push({
        id: 'latency-high',
        level: 'warning',
        title: 'Latencia elevada detectada (persistente)',
        message: `La latencia elevada se mantiene en el tiempo (score ${incidentScore}/100). Se recomienda mitigacion activa para evitar microcortes.`,
        suggestedAction: 'turbo_boost',
        createdAt: now,
      })
    }

    if (!persistentIncident && incidentScore >= 30) {
      recommendations.push({
        id: 'transient-network-spike',
        level: 'info',
        title: 'Pico transitorio detectado',
        message:
          'Se detecto una variacion puntual pero aun no sostenida. Manteniendo observacion para confirmar si evoluciona a incidencia real.',
        createdAt: now,
      })
    }

    if (devices.length >= 12) {
      recommendations.push({
        id: 'too-many-devices',
        level: 'warning',
        title: 'Alta densidad de dispositivos',
        message:
          'Hay demasiados dispositivos conectados para una red domestica media. Considera segmentar por banda o crear red de invitados.',
        createdAt: now,
      })
    }

    if (heavyProcess && heavyProcess.estimatedUsageScore > 9) {
      recommendations.push({
        id: 'heavy-process',
        level: 'info',
        title: 'Consumo elevado en proceso local',
        message: `El proceso ${heavyProcess.name} concentra la mayor actividad de red. Evalua si requiere limitacion o cierre temporal.`,
        suggestedAction: 'clear_network_cache',
        createdAt: now,
      })
    }

    if (!recommendations.length) {
      recommendations.push({
        id: 'network-stable',
        level: 'info',
        title: 'Estado de red estable',
        message: `No se detectan problemas sostenidos. Señal compuesta actual: ${round(incidentScore, 0)}/100 de riesgo.`,
        createdAt: now,
      })
    }

    return recommendations
  }

  private updateSmoothedMetrics(metrics: NetworkMetrics): {
    pingMs: number
    jitterMs: number
    healthScore: number
  } {
    const alpha = 0.35

    this.smoothedPingMs =
      this.smoothedPingMs === null
        ? metrics.pingMs
        : this.smoothedPingMs * (1 - alpha) + metrics.pingMs * alpha

    this.smoothedJitterMs =
      this.smoothedJitterMs === null
        ? metrics.jitterMs
        : this.smoothedJitterMs * (1 - alpha) + metrics.jitterMs * alpha

    this.smoothedHealthScore =
      this.smoothedHealthScore === null
        ? metrics.healthScore
        : this.smoothedHealthScore * (1 - alpha) + metrics.healthScore * alpha

    return {
      pingMs: this.smoothedPingMs,
      jitterMs: this.smoothedJitterMs,
      healthScore: this.smoothedHealthScore,
    }
  }

  private computeIncidentScore(input: {
    metrics: NetworkMetrics
    smoothed: { pingMs: number; jitterMs: number; healthScore: number }
    devicesCount: number
    heavyProcess?: ProcessUsage
  }): number {
    const { metrics, smoothed, devicesCount, heavyProcess } = input

    const healthRisk = clamp(((55 - smoothed.healthScore) / 55) * 42, 0, 42)
    const pingRisk = clamp(((smoothed.pingMs - 70) / 80) * 24, 0, 24)
    const jitterRisk = clamp(((smoothed.jitterMs - 16) / 36) * 20, 0, 20)
    const loadRisk = clamp(((metrics.estimatedBandwidthUsageMbps - 3) / 7) * 8, 0, 8)
    const crowdRisk = clamp(((devicesCount - 8) / 10) * 6, 0, 6)

    const processRisk = clamp(((heavyProcess?.estimatedUsageScore ?? 0) - 8) * 0.55, 0, 6)

    return round(healthRisk + pingRisk + jitterRisk + loadRisk + crowdRisk + processRisk, 0)
  }

  private updateIncidentStreak(incidentScore: number): boolean {
    if (incidentScore >= 40) {
      this.incidentStreak += 1
    } else if (incidentScore < 30) {
      this.incidentStreak = 0
    } else {
      this.incidentStreak = Math.max(0, this.incidentStreak - 1)
    }

    return this.incidentStreak >= 2
  }
}
