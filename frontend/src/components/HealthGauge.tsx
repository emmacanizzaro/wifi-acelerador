interface HealthGaugeProps {
  score: number
}

export function HealthGauge({ score }: HealthGaugeProps): JSX.Element {
  const color = score > 80 ? 'text-accent' : score > 50 ? 'text-warning' : 'text-danger'

  return (
    <div className="glass-panel rounded-2xl p-5">
      <p className="metric-label text-xs uppercase tracking-[0.16em] text-slate-400">WiFi Health</p>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <div className={`metric-label text-2xl font-bold ${color}`}>{score}</div>
          <div className="absolute -inset-1 -z-10 rounded-full border border-accent/20 animate-pulseGlow" />
        </div>
        <div>
          <p className="text-sm text-slate-300">Score de salud global (1-100)</p>
          <p className="mt-1 text-xs text-slate-400">
            Basado en latencia, jitter, carga y dispositivos conectados.
          </p>
        </div>
      </div>
    </div>
  )
}
