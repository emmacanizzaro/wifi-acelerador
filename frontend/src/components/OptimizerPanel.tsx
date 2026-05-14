import { useMemo, useState } from 'react';
import { AutoRecoverySettings, OptimizationAction } from '../../../shared/types/network';

interface OptimizerPanelProps {
  runAction: (action: OptimizationAction) => void
  autoRecoverySettings: AutoRecoverySettings
  updateAutoRecoverySettings: (settings: Partial<AutoRecoverySettings>) => void
  logText: string
}

const actions: Array<{ action: OptimizationAction; label: string; description: string }> = [
  {
    action: 'turbo_boost',
    label: 'Limpieza Inteligente 1-Clic',
    description: 'Limpia DNS/cache, renueva IP, reinicia adaptador y compara el antes/despues.',
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

export function OptimizerPanel({
  runAction,
  autoRecoverySettings,
  updateAutoRecoverySettings,
  logText,
}: OptimizerPanelProps): JSX.Element {
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

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-300">
              Auto-Recovery
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Activa limpieza inteligente automatica cuando la red entra en zona critica.
            </p>
          </div>
          <button
            onClick={() => updateAutoRecoverySettings({ enabled: !autoRecoverySettings.enabled })}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${autoRecoverySettings.enabled ? 'bg-accent/20 text-accent border border-accent/50' : 'bg-white/10 text-slate-300 border border-white/20'}`}
          >
            {autoRecoverySettings.enabled ? 'Activado' : 'Desactivado'}
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Salud minima</span>
              <span>{autoRecoverySettings.healthThreshold}</span>
            </div>
            <input
              type="range"
              min={10}
              max={80}
              step={1}
              value={autoRecoverySettings.healthThreshold}
              onChange={(event) =>
                updateAutoRecoverySettings({ healthThreshold: Number(event.target.value) })
              }
              className="mt-1 w-full accent-accent"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Ping critico (ms)</span>
              <span>{autoRecoverySettings.pingThreshold}</span>
            </div>
            <input
              type="range"
              min={20}
              max={250}
              step={1}
              value={autoRecoverySettings.pingThreshold}
              onChange={(event) =>
                updateAutoRecoverySettings({ pingThreshold: Number(event.target.value) })
              }
              className="mt-1 w-full accent-accent"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Jitter critico (ms)</span>
              <span>{autoRecoverySettings.jitterThreshold}</span>
            </div>
            <input
              type="range"
              min={5}
              max={120}
              step={1}
              value={autoRecoverySettings.jitterThreshold}
              onChange={(event) =>
                updateAutoRecoverySettings({ jitterThreshold: Number(event.target.value) })
              }
              className="mt-1 w-full accent-accent"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Cooldown (seg)</span>
              <span>{Math.round(autoRecoverySettings.cooldownMs / 1000)}</span>
            </div>
            <input
              type="range"
              min={20}
              max={900}
              step={10}
              value={Math.round(autoRecoverySettings.cooldownMs / 1000)}
              onChange={(event) =>
                updateAutoRecoverySettings({ cooldownMs: Number(event.target.value) * 1000 })
              }
              className="mt-1 w-full accent-accent"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 max-h-44 overflow-auto rounded-xl border border-white/10 bg-[#060a11] p-3">
        <pre className="whitespace-pre-wrap text-xs text-slate-300">
          {logText || 'Logs de optimizacion apareceran aqui.'}
        </pre>
      </div>
    </div>
  )
}
