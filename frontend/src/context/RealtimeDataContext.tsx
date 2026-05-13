import React, { createContext, useEffect, useMemo, useState } from 'react';
import { SOCKET_EVENTS } from '../../../shared/constants/network';
import {
    AceleratorInsightRecommendation,
    DeviceInfo,
    HistoricalPoint,
    NetworkMetrics,
    OptimizationAction,
    OptimizationActionResult,
    ProcessUsage,
} from '../../../shared/types/network';
import { socket } from '../services/socket';

interface RealtimeDataState {
  metrics: NetworkMetrics | null
  history: HistoricalPoint[]
  devices: DeviceInfo[]
  processes: ProcessUsage[]
  recommendations: AceleratorInsightRecommendation[]
  logs: Array<{ level: 'info' | 'warn' | 'error'; message: string; timestamp: number }>
  lastActionResult: OptimizationActionResult | null
  loading: boolean
  error: string | null
  runAction: (action: OptimizationAction) => void
}

export const RealtimeDataContext = createContext<RealtimeDataState | null>(null)

export function RealtimeDataProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null)
  const [history, setHistory] = useState<HistoricalPoint[]>([])
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [processes, setProcesses] = useState<ProcessUsage[]>([])
  const [recommendations, setRecommendations] = useState<AceleratorInsightRecommendation[]>([])
  const [logs, setLogs] = useState<
    Array<{ level: 'info' | 'warn' | 'error'; message: string; timestamp: number }>
  >([])
  const [lastActionResult, setLastActionResult] = useState<OptimizationActionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    socket.emit(SOCKET_EVENTS.DASHBOARD_REQUEST_SNAPSHOT)

    socket.on(SOCKET_EVENTS.METRICS_UPDATE, (payload) => {
      setMetrics(payload)
      setLoading(false)
    })

    socket.on(SOCKET_EVENTS.METRICS_HISTORY, setHistory)
    socket.on(SOCKET_EVENTS.DEVICES_UPDATE, setDevices)
    socket.on(SOCKET_EVENTS.PROCESSES_UPDATE, setProcesses)
    socket.on(SOCKET_EVENTS.ACELERATOR_INSIGHTS_UPDATE, setRecommendations)

    socket.on(SOCKET_EVENTS.OPTIMIZER_RESULT, (payload) => {
      const normalizedOutput = payload.output?.trim() ?? ''
      const outputSummary = normalizedOutput
        .split('\n')
        .find((line) => line.trim().length > 0)
        ?.trim()

      setLastActionResult(payload)
      setLogs((prev) =>
        [
          {
            level: (payload.success ? 'info' : 'error') as 'info' | 'error',
            message: payload.success
              ? `${payload.action}: success`
              : `${payload.action}: failed (${outputSummary ?? 'No se recibio detalle del error'})`,
            timestamp: payload.timestamp,
          },
          ...prev,
        ].slice(0, 120),
      )
    })

    socket.on(SOCKET_EVENTS.SERVER_LOG, (payload) => {
      setLogs((prev) => [payload, ...prev].slice(0, 120))
    })

    socket.on(SOCKET_EVENTS.SERVER_ERROR, (payload) => {
      setError(payload.message)
      setLogs((prev) =>
        [
          { level: 'error' as 'error', message: payload.message, timestamp: Date.now() },
          ...prev,
        ].slice(0, 120),
      )
    })

    return () => {
      socket.off(SOCKET_EVENTS.METRICS_UPDATE)
      socket.off(SOCKET_EVENTS.METRICS_HISTORY)
      socket.off(SOCKET_EVENTS.DEVICES_UPDATE)
      socket.off(SOCKET_EVENTS.PROCESSES_UPDATE)
      socket.off(SOCKET_EVENTS.ACELERATOR_INSIGHTS_UPDATE)
      socket.off(SOCKET_EVENTS.OPTIMIZER_RESULT)
      socket.off(SOCKET_EVENTS.SERVER_LOG)
      socket.off(SOCKET_EVENTS.SERVER_ERROR)
    }
  }, [])

  const value = useMemo(
    () => ({
      metrics,
      history,
      devices,
      processes,
      recommendations,
      logs,
      lastActionResult,
      loading,
      error,
      runAction: (action: OptimizationAction) =>
        socket.emit(SOCKET_EVENTS.OPTIMIZER_RUN, { action }),
    }),
    [metrics, history, devices, processes, recommendations, logs, lastActionResult, loading, error],
  )

  return <RealtimeDataContext.Provider value={value}>{children}</RealtimeDataContext.Provider>
}
