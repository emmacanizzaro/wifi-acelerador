import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string
  value: string
  hint: string
  icon: LucideIcon
}

export function MetricCard({ title, value, hint, icon: Icon }: MetricCardProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-4 shadow-glow"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="metric-label text-xs uppercase tracking-[0.16em] text-slate-400">{title}</p>
        <Icon size={18} className="text-accentBlue" />
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </motion.div>
  )
}
