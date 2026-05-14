import {
    AceleratorInsightRecommendation,
    DeviceInfo,
    NetworkMetrics,
    ProcessUsage,
} from '../../shared/types/network';

export class AceleratorInsightsService {
  analyze(input: {
    metrics: NetworkMetrics | null
    devices: DeviceInfo[]
    processes: ProcessUsage[]
  }): AceleratorInsightRecommendation[] {
    const recommendations: AceleratorInsightRecommendation[] = []

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

    if (metrics.estimatedBandwidthUsageMbps > 0.8 && metrics.uploadMbps < 1.5) {
      recommendations.push({
        id: 'root-cause-upload-saturation',
        level: 'warning',
        title: 'Causa raiz: subida saturada',
        message:
          'La subida disponible es baja frente al uso detectado. Evita backups/sincronizacion temporalmente y prioriza trafico interactivo.',
        suggestedAction: 'turbo_boost',
        createdAt: Date.now(),
      })
    }

    if (metrics.pingMs > 90 && metrics.jitterMs <= 18) {
      recommendations.push({
        id: 'root-cause-upstream-latency',
        level: 'warning',
        title: 'Causa raiz: latencia aguas arriba',
        message:
          'El ping esta alto con jitter moderado, lo que sugiere congestion externa o del ISP. Prueba en otro horario y compara.',
        suggestedAction: 'speed_test',
        createdAt: Date.now(),
      })
    }

    if (metrics.pingMs > 80 && devices.length >= 10) {
      recommendations.push({
        id: 'root-cause-device-contention',
        level: 'warning',
        title: 'Causa raiz: contencion por dispositivos',
        message:
          'Hay muchos equipos activos durante una ventana de latencia alta. Considera banda separada para IoT e invitados.',
        suggestedAction: 'restart_adapter',
        createdAt: Date.now(),
      })
    }

    if (metrics.pingMs > 80 || metrics.jitterMs > 22) {
      recommendations.push({
        id: 'latency-high',
        level: 'warning',
        title: 'Latencia elevada detectada',
        message:
          'Tu red tiene latencia y jitter altos. Revisa interferencias y evita descargas simultaneas.',
        suggestedAction: 'turbo_boost',
        createdAt: Date.now(),
      })
    }

    if (devices.length >= 12) {
      recommendations.push({
        id: 'too-many-devices',
        level: 'warning',
        title: 'Alta densidad de dispositivos',
        message:
          'Hay demasiados dispositivos conectados para una red domestica media. Considera segmentar por banda o crear red de invitados.',
        createdAt: Date.now(),
      })
    }

    if (heavyProcess && heavyProcess.estimatedUsageScore > 9) {
      recommendations.push({
        id: 'heavy-process',
        level: 'info',
        title: 'Consumo elevado en proceso local',
        message: `El proceso ${heavyProcess.name} concentra la mayor actividad de red. Evalua si requiere limitacion o cierre temporal.`,
        suggestedAction: 'clear_network_cache',
        createdAt: Date.now(),
      })
    }

    if (metrics.healthScore < 45) {
      recommendations.push({
        id: 'router-restart',
        level: 'critical',
        title: 'Salud WiFi critica',
        message:
          'Se recomienda reiniciar el router y revisar canal WiFi, especialmente en 2.4GHz si hay saturacion.',
        suggestedAction: 'turbo_boost',
        createdAt: Date.now(),
      })
    }

    if (!recommendations.length) {
      recommendations.push({
        id: 'network-stable',
        level: 'info',
        title: 'Estado de red estable',
        message:
          'No se detectan problemas severos en este momento. Manten monitoreo activo para prevenir degradacion.',
        createdAt: Date.now(),
      })
    }

    return recommendations
  }
}
