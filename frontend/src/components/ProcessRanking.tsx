import { useEffect, useMemo, useState } from 'react';
import { ProcessUsage } from '../../../shared/types/network';

interface ProcessRankingProps {
  processes: ProcessUsage[]
}

export function ProcessRanking({ processes }: ProcessRankingProps): JSX.Element {
  const [alertThreshold, setAlertThreshold] = useState(7)

  useEffect(() => {
    const savedThreshold = Number(localStorage.getItem('wifi-acelerator-process-alert-threshold'))
    if (Number.isFinite(savedThreshold) && savedThreshold >= 1 && savedThreshold <= 20) {
      setAlertThreshold(savedThreshold)
    }
  }, [])

  const highUsageProcesses = useMemo(
    () => processes.filter((item) => item.estimatedUsageScore >= alertThreshold),
    [alertThreshold, processes],
  )

  const handleThresholdChange = (value: number): void => {
    setAlertThreshold(value)
    localStorage.setItem('wifi-acelerator-process-alert-threshold', String(value))
    window.dispatchEvent(
      new CustomEvent<number>('wifi-acelerator:process-threshold-update', { detail: value }),
    )
  }

  return (
    <div className="glass-panel rounded-2xl p-5">
      <p className="metric-label text-xs uppercase tracking-[0.16em] text-slate-400">
        Ranking de Consumo
      </p>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-300">Umbral de alerta por score</p>
          <span className="text-xs font-semibold text-accent">{alertThreshold.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          step={0.5}
          value={alertThreshold}
          onChange={(event) => handleThresholdChange(Number(event.target.value))}
          className="mt-2 w-full accent-accent"
        />
        {highUsageProcesses.length > 0 && (
          <p className="mt-2 text-xs text-warning">
            Alerta activa: {highUsageProcesses.length} proceso(s) superan el umbral configurado.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {processes.length === 0 && (
          <p className="text-sm text-slate-400">No hay procesos de red activos en este momento.</p>
        )}
        {processes.map((item, index) => (
          <div
            key={`${item.pid}-${item.name}`}
            className={`rounded-xl border p-3 ${item.estimatedUsageScore >= alertThreshold ? 'border-warning/60 bg-warning/10' : 'border-white/10 bg-white/5'}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-white">
                #{index + 1} {item.name}
              </p>
              <p className="text-xs text-slate-400">PID {item.pid}</p>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
              <span>Conexiones: {item.activeConnections}</span>
              <span>Score: {item.estimatedUsageScore}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
