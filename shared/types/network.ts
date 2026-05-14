export type NetworkHealthStatus = 'excellent' | 'good' | 'warning' | 'critical'

export interface NetworkMetrics {
  timestamp: number
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
  connectedDevices: number
  estimatedBandwidthUsageMbps: number
  healthScore: number
  healthStatus: NetworkHealthStatus
}

export interface DeviceInfo {
  ip: string
  hostname: string
  mac: string
  vendor: string
  online: boolean
  responseTimeMs: number
  lastSeen: number
}

export interface ProcessUsage {
  pid: number
  name: string
  activeConnections: number
  estimatedUsageScore: number
}

export interface OptimizationActionResult {
  action: OptimizationAction
  success: boolean
  output: string
  durationMs: number
  timestamp: number
}

export type OptimizationAction =
  | 'turbo_boost'
  | 'flush_dns'
  | 'renew_ip'
  | 'clear_network_cache'
  | 'restart_adapter'
  | 'speed_test'

export interface AutoRecoverySettings {
  enabled: boolean
  healthThreshold: number
  pingThreshold: number
  jitterThreshold: number
  cooldownMs: number
}

export interface AceleratorInsightRecommendation {
  id: string
  level: 'info' | 'warning' | 'critical'
  title: string
  message: string
  suggestedAction?: OptimizationAction
  createdAt: number
}

export interface HistoricalPoint {
  timestamp: number
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  healthScore: number
}
