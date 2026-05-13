import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { HistoricalPoint } from '../../../shared/types/network';

interface LiveChartProps {
  history: HistoricalPoint[]
}

export function LiveChart({ history }: LiveChartProps): JSX.Element {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <p className="metric-label text-xs uppercase tracking-[0.16em] text-slate-400">
        Graficos En Vivo
      </p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
            />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(8,12,20,0.92)',
                border: '1px solid rgba(148,163,184,0.25)',
                borderRadius: 12,
                color: '#fff',
              }}
              labelFormatter={(value) => new Date(Number(value)).toLocaleTimeString()}
            />
            <Line
              type="monotone"
              dataKey="downloadMbps"
              stroke="#00e5b0"
              dot={false}
              strokeWidth={2.2}
              name="Download Mbps"
            />
            <Line
              type="monotone"
              dataKey="uploadMbps"
              stroke="#00c2ff"
              dot={false}
              strokeWidth={2.2}
              name="Upload Mbps"
            />
            <Line
              type="monotone"
              dataKey="pingMs"
              stroke="#ffb347"
              dot={false}
              strokeWidth={2}
              name="Ping ms"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
