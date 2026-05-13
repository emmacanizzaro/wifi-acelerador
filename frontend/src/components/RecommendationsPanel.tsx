import { AlertTriangle, Info, Siren } from 'lucide-react';
import { AceleratorInsightRecommendation } from '../../../shared/types/network';

interface RecommendationsPanelProps {
  recommendations: AceleratorInsightRecommendation[]
}

function iconByLevel(level: AceleratorInsightRecommendation['level']) {
  if (level === 'critical') return <Siren size={16} className="text-danger" />
  if (level === 'warning') return <AlertTriangle size={16} className="text-warning" />
  return <Info size={16} className="text-accentBlue" />
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps): JSX.Element {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <p className="metric-label text-xs uppercase tracking-[0.16em] text-slate-400">
        Acelerator Insights
      </p>
      <div className="mt-4 space-y-2">
        {recommendations.map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              {iconByLevel(item.level)}
              <p className="text-sm font-medium text-white">{item.title}</p>
            </div>
            <p className="mt-1 text-xs text-slate-300">{item.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
