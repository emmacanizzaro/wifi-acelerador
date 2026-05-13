import { DevicesTable } from '../components/DevicesTable';
import { useRealtimeData } from '../hooks/useRealtimeData';

export function DevicesPage(): JSX.Element {
  const { devices, loading, error } = useRealtimeData()

  if (loading && !devices) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-300">
        Cargando dispositivos...
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

  return <DevicesTable devices={devices} />
}
