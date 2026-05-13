import si from 'systeminformation';
import { ProcessUsage } from '../../shared/types/network';

export class ProcessUsageService {
  private cache: ProcessUsage[] = []

  async collect(): Promise<ProcessUsage[]> {
    const connections = await si.networkConnections()

    const grouped = new Map<string, { pid: number; name: string; activeConnections: number }>()

    for (const item of connections) {
      if (!item.process || !item.pid) continue
      if (item.state !== 'ESTABLISHED') continue

      const key = `${item.pid}:${item.process}`
      const current = grouped.get(key) ?? {
        pid: item.pid,
        name: item.process,
        activeConnections: 0,
      }
      current.activeConnections += 1
      grouped.set(key, current)
    }

    const ranking = Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        estimatedUsageScore: Number((entry.activeConnections * 1.35).toFixed(2)),
      }))
      .sort((a, b) => b.estimatedUsageScore - a.estimatedUsageScore)
      .slice(0, 10)

    this.cache = ranking
    return ranking
  }

  getCached(): ProcessUsage[] {
    return this.cache
  }
}
