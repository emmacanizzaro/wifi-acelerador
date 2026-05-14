import { AlertTriangle, Info, Siren } from 'lucide-react';
import { AceleratorInsightRecommendation, OptimizationAction } from '../../../shared/types/network';

interface RecommendationsPanelProps {
  recommendations: AceleratorInsightRecommendation[]
  runAction: (action: OptimizationAction) => void
}

const actionLabel: Record<OptimizationAction, string> = {
  turbo_boost: 'Aplicar limpieza inteligente',
  flush_dns: 'Ejecutar flush DNS',
  renew_ip: 'Renovar IP',
  clear_network_cache: 'Limpiar cache de red',
  restart_adapter: 'Reiniciar adaptador',
  speed_test: 'Correr speed test',
}

const trendLabel: Record<'improving' | 'stable' | 'degrading', string> = {
  improving: 'Mejorando',
  stable: 'Estable',
  degrading: 'Empeorando',
}

const rootCauseLabel: Record<string, string> = {
  health: 'Salud',
  latency: 'Latencia',
  jitter: 'Jitter',
  upload: 'Carga de subida',
  device_contention: 'Contencion',
  local_process: 'Proceso local',
}

function getTopRootCauses(
  scores: Record<string, number> | undefined,
): Array<{ key: string; value: number }> {
  if (!scores) return []

  return Object.entries(scores)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key, value]) => ({ key, value }))
}

function iconByLevel(level: AceleratorInsightRecommendation['level']) {
  if (level === 'critical') return <Siren size={16} className="text-danger" />
  if (level === 'warning') return <AlertTriangle size={16} className="text-warning" />
  return <Info size={16} className="text-accentBlue" />
}

export function RecommendationsPanel({
  recommendations,
  runAction,
}: RecommendationsPanelProps): JSX.Element {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <p className="metric-label text-xs uppercase tracking-[0.16em] text-slate-400">
        Acelerator Insights
      </p>
      <div className="mt-4 space-y-2">
        {recommendations.map((item) => {
          const suggestedAction = item.suggestedAction
          const telemetry = item.telemetry
          const topCauses = getTopRootCauses(telemetry?.rootCauseScores)

          return (
            <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2">
                {iconByLevel(item.level)}
                <p className="text-sm font-medium text-white">{item.title}</p>
              </div>
              <p className="mt-1 text-xs text-slate-300">{item.message}</p>
              {telemetry && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-slate-200">
                    Riesgo {telemetry.incidentScore}/100
                  </span>
                  <span
                    className={`rounded-md border px-2 py-1 ${
                      telemetry.trend === 'degrading'
                        ? 'border-danger/60 bg-danger/10 text-danger'
                        : telemetry.trend === 'improving'
                          ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300'
                          : 'border-white/20 bg-white/5 text-slate-300'
                    }`}
                  >
                    Tendencia: {trendLabel[telemetry.trend]}
                  </span>
                  {topCauses.map((cause) => (
                    <span
                      key={cause.key}
                      className="rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-accent"
                    >
                      {rootCauseLabel[cause.key] ?? cause.key}: {cause.value}
                    </span>
                  ))}
                </div>
              )}
              {suggestedAction && (
                <button
                  onClick={() => runAction(suggestedAction)}
                  className="mt-3 rounded-lg border border-accent/50 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/25"
                >
                  {actionLabel[suggestedAction]}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
