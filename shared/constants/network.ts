export const SOCKET_EVENTS = {
  METRICS_UPDATE: 'metrics:update',
  METRICS_HISTORY: 'metrics:history',
  DEVICES_UPDATE: 'devices:update',
  PROCESSES_UPDATE: 'processes:update',
  ACELERATOR_INSIGHTS_UPDATE: 'acelerator-insights:update',
  OPTIMIZER_RESULT: 'optimizer:result',
  SERVER_LOG: 'server:log',
  SERVER_ERROR: 'server:error',
  OPTIMIZER_RUN: 'optimizer:run',
  AUTO_RECOVERY_SETTINGS: 'auto-recovery:settings',
  AUTO_RECOVERY_UPDATE_SETTINGS: 'auto-recovery:update_settings',
  DASHBOARD_REQUEST_SNAPSHOT: 'dashboard:request_snapshot',
} as const

export const POLLING_INTERVALS = {
  METRICS_MS: 3000,
  DEVICES_MS: 12000,
  PROCESSES_MS: 5000,
  ACELERATOR_INSIGHTS_MS: 6000,
} as const
