import {
    AceleratorInsightRecommendation,
    DeviceInfo,
    HistoricalPoint,
    NetworkMetrics,
    OptimizationAction,
    OptimizationActionResult,
    ProcessUsage,
} from './network';

export interface ServerToClientEvents {
  'metrics:update': (payload: NetworkMetrics) => void
  'metrics:history': (payload: HistoricalPoint[]) => void
  'devices:update': (payload: DeviceInfo[]) => void
  'processes:update': (payload: ProcessUsage[]) => void
  'acelerator-insights:update': (payload: AceleratorInsightRecommendation[]) => void
  'optimizer:result': (payload: OptimizationActionResult) => void
  'server:log': (payload: {
    level: 'info' | 'warn' | 'error'
    message: string
    timestamp: number
  }) => void
  'server:error': (payload: { message: string }) => void
}

export interface ClientToServerEvents {
  'optimizer:run': (payload: { action: OptimizationAction }) => void
  'dashboard:request_snapshot': () => void
}
