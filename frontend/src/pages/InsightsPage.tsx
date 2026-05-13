import { RecommendationsPanel } from '../components/RecommendationsPanel';
import { useRealtimeData } from '../hooks/useRealtimeData';

export function InsightsPage(): JSX.Element {
  const { recommendations, loading, error } = useRealtimeData()

  if (loading && !recommendations) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-300">
        Cargando recomendaciones...
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

  return <RecommendationsPanel recommendations={recommendations} />
}
