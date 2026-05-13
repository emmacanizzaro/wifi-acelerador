import { useMemo, useState } from 'react';
import { OptimizationAction } from '../../../shared/types/network';

interface OptimizerPanelProps {
  runAction: (action: OptimizationAction) => void
  logText: string
}

const actions: Array<{ action: OptimizationAction; label: string; description: string }> = [
  {
    action: 'turbo_boost',
    label: 'Modo Turbo 1-Clic',
    description: 'Ejecuta limpieza + renovacion + comparativa antes/despues.',
  },
  { action: 'flush_dns', label: 'Flush DNS', description: 'Limpia cache DNS local.' },
  { action: 'renew_ip', label: 'Renovar IP', description: 'Solicita nueva IP al DHCP.' },
  {
    action: 'clear_network_cache',
    label: 'Limpiar cache de red',
    description: 'Resetea cache de rutas y sockets.',
  },
  {
    action: 'restart_adapter',
    label: 'Reiniciar adaptador',
    description: 'Apaga y enciende adaptador de red.',
  },
  {
    action: 'speed_test',
    label: 'Test de velocidad',
    description: 'Ejecuta prueba real de velocidad.',
  },
]

export function OptimizerPanel({ runAction, logText }: OptimizerPanelProps): JSX.Element {
  const [runningAction, setRunningAction] = useState<OptimizationAction | null>(null)

  const loadingLabel = useMemo(() => {
    if (!runningAction) return ''
    return `Ejecutando ${actions.find((item) => item.action === runningAction)?.label ?? runningAction}...`
  }, [runningAction])

  return (
    <div className="glass-panel rounded-2xl p-5">
      <p className="metric-label text-xs uppercase tracking-[0.16em] text-slate-400">
        Optimizacion Local
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {actions.map((item) => (
          <button
            key={item.action}
            onClick={() => {
              setRunningAction(item.action)
              runAction(item.action)
              window.setTimeout(() => setRunningAction(null), 1500)
            }}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-accent/40 hover:bg-accent/10"
          >
            <p className="text-sm font-medium text-white">{item.label}</p>
            <p className="mt-1 text-xs text-slate-300">{item.description}</p>
          </button>
        ))}
      </div>

      {runningAction && <p className="mt-4 text-xs text-accent animate-pulse">{loadingLabel}</p>}

      <div className="mt-4 max-h-44 overflow-auto rounded-xl border border-white/10 bg-[#060a11] p-3">
        <pre className="whitespace-pre-wrap text-xs text-slate-300">
          {logText || 'Logs de optimizacion apareceran aqui.'}
        </pre>
      </div>
    </div>
  )
}
