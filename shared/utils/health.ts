import { NetworkHealthStatus, NetworkMetrics } from '../types/network';

export function computeHealthStatus(score: number): NetworkHealthStatus {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 45) return 'warning'
  return 'critical'
}

export function computeHealthScore(
  metrics: Pick<
    NetworkMetrics,
    'pingMs' | 'jitterMs' | 'downloadMbps' | 'uploadMbps' | 'connectedDevices'
  >,
): number {
  const pingPenalty = Math.min(metrics.pingMs * 0.8, 35)
  const jitterPenalty = Math.min(metrics.jitterMs * 1.1, 20)
  const crowdPenalty = Math.max(0, metrics.connectedDevices - 10) * 1.6
  const throughputReward = Math.min((metrics.downloadMbps + metrics.uploadMbps) * 0.2, 25)

  const raw = 78 - pingPenalty - jitterPenalty - crowdPenalty + throughputReward
  return Math.max(1, Math.min(100, Math.round(raw)))
}
