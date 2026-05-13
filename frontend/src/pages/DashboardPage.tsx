import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowDownCircle, ArrowUpCircle, Gauge, Router } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DevicesTable } from '../components/DevicesTable';
import { HealthGauge } from '../components/HealthGauge';
import { LiveChart } from '../components/LiveChart';
import { MetricCard } from '../components/MetricCard';
import { OptimizerPanel } from '../components/OptimizerPanel';
import { ProcessRanking } from '../components/ProcessRanking';
import { RecommendationsPanel } from '../components/RecommendationsPanel';
import { useRealtimeData } from '../hooks/useRealtimeData';

const actionLabel: Record<string, string> = {
  turbo_boost: 'Modo Turbo 1-Clic',
  flush_dns: 'Flush DNS',
  renew_ip: 'Renovar IP',
  clear_network_cache: 'Limpiar cache de red',
  restart_adapter: 'Reiniciar adaptador',
  speed_test: 'Test de velocidad',
}

function getOptimizerErrorSummary(output: string): string {
  const firstLine =
    output
      .split('\n')
      .find((line) => line.trim().length > 0)
      ?.trim() ?? ''
  if (!firstLine) return 'No se pudo ejecutar la accion.'
  if (firstLine.length <= 120) return firstLine
  return `${firstLine.slice(0, 117)}...`
}

function getTurboImpactSummary(output: string): string | null {
  const line = output
    .split('\n')
    .find((item) => item.toLowerCase().startsWith('mejora estimada =>'))
    ?.trim()
  return line ?? null
}

export function DashboardPage(): JSX.Element {
  const processSectionRef = useRef<HTMLDivElement | null>(null)
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [processSectionHighlighted, setProcessSectionHighlighted] = useState(false)

  useEffect(() => {
    const handleFocusProcesses = () => {
      processSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setProcessSectionHighlighted(true)

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setProcessSectionHighlighted(false)
      }, 1800)
    }

    window.addEventListener('wifi-acelerator:focus-processes', handleFocusProcesses)
    return () => {
      window.removeEventListener('wifi-acelerator:focus-processes', handleFocusProcesses)
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  const {
    metrics,
    history,
    devices,
    processes,
    recommendations,
    logs,
    runAction,
    loading,
    error,
    lastActionResult,
  } = useRealtimeData()

  if (loading && !metrics) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-300">
        Inicializando motor de monitoreo en tiempo real...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/50 bg-danger/10 p-6 text-danger">
        Error de comunicacion con backend: {error}
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-300">
        Sin datos disponibles.
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Download"
          value={`${metrics.downloadMbps} Mbps`}
          hint="Velocidad de descarga"
          icon={ArrowDownCircle}
        />
        <MetricCard
          title="Upload"
          value={`${metrics.uploadMbps} Mbps`}
          hint="Velocidad de subida"
          icon={ArrowUpCircle}
        />
        <MetricCard
          title="Ping / Jitter"
          value={`${metrics.pingMs} / ${metrics.jitterMs} ms`}
          hint="Latencia y variacion"
          icon={Gauge}
        />
        <MetricCard
          title="Dispositivos Online"
          value={`${metrics.connectedDevices}`}
          hint="Escaner LAN activo"
          icon={Router}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <HealthGauge score={metrics.healthScore} />
        <div className="glass-panel rounded-2xl p-5">
          <p className="metric-label text-xs uppercase tracking-[0.16em] text-slate-400">
            Estado General
          </p>
          <p className="mt-4 text-2xl font-semibold capitalize text-white">
            {metrics.healthStatus}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Uso estimado: {metrics.estimatedBandwidthUsageMbps} Mbps
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Actualizacion: {new Date(metrics.timestamp).toLocaleTimeString()}
          </p>
          {lastActionResult && (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-xs ${lastActionResult.success ? 'bg-accent/20 text-accent' : 'bg-danger/20 text-danger'}`}
            >
              <p>
                Ultima accion: {actionLabel[lastActionResult.action] ?? lastActionResult.action}{' '}
                {lastActionResult.success ? 'completada' : 'fallida'}
              </p>
              {!lastActionResult.success && (
                <p className="mt-1 text-[11px] opacity-90">
                  Motivo: {getOptimizerErrorSummary(lastActionResult.output)}
                </p>
              )}
              {lastActionResult.success && lastActionResult.action === 'turbo_boost' && (
                <p className="mt-1 text-[11px] opacity-90">
                  Impacto:{' '}
                  {getTurboImpactSummary(lastActionResult.output) ?? 'Comparativa no disponible.'}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <p className="metric-label text-xs uppercase tracking-[0.16em] text-slate-400">
            Ancho de Banda
          </p>
          <p className="mt-4 text-3xl font-semibold text-accentBlue">
            {metrics.estimatedBandwidthUsageMbps} Mbps
          </p>
          <p className="mt-2 text-sm text-slate-300">Estimacion agregada de trafico local.</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Activity size={14} />
            Streaming Socket.IO en tiempo real
          </div>
        </div>
      </section>

      <LiveChart history={history} />

      <section className="grid gap-4 xl:grid-cols-2">
        <DevicesTable devices={devices} />
        <div
          ref={processSectionRef}
          className={`relative rounded-2xl transition-all duration-500 ${processSectionHighlighted ? 'ring-2 ring-warning/70 shadow-[0_0_32px_rgba(245,158,11,0.32)]' : ''}`}
        >
          <AnimatePresence>
            {processSectionHighlighted && (
              <motion.div
                className="absolute -top-2 right-3 z-10 rounded-full border border-warning/50 bg-warning/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-warning"
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                Procesos priorizados
              </motion.div>
            )}
          </AnimatePresence>
          <ProcessRanking processes={processes} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <OptimizerPanel
          runAction={runAction}
          logText={logs
            .slice(0, 20)
            .map(
              (item) =>
                `[${new Date(item.timestamp).toLocaleTimeString()}] ${item.level.toUpperCase()} ${item.message}`,
            )
            .join('\n')}
        />
        <RecommendationsPanel recommendations={recommendations} />
      </section>
    </motion.div>
  )
}
