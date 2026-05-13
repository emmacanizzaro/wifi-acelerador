import { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { POLLING_INTERVALS, SOCKET_EVENTS } from '../../shared/constants/network';
import { HistoricalPoint, OptimizationAction } from '../../shared/types/network';
import { ClientToServerEvents, ServerToClientEvents } from '../../shared/types/socket';
import { MetricsService } from '../network/metrics.service';
import { LanScannerService } from '../scanner/lan-scanner.service';
import { AceleratorInsightsService } from '../services/acelerator-insights.service';
import { logger } from '../services/logger';
import { OptimizerService } from '../system/optimizer.service';
import { ProcessUsageService } from '../system/process-usage.service';

export class SocketGateway {
  private readonly metricsService = new MetricsService()
  private readonly scannerService = new LanScannerService()
  private readonly processService = new ProcessUsageService()
  private readonly optimizerService = new OptimizerService()
  private readonly aceleratorInsightsService = new AceleratorInsightsService()

  private readonly history: HistoricalPoint[] = []
  private io: Server<ClientToServerEvents, ServerToClientEvents>

  constructor(server: HttpServer) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
      cors: {
        origin: '*',
      },
    })

    this.registerSocketHandlers()
    this.startPollingLoops()
  }

  private registerSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`)
      this.pushSnapshot(socket.id)

      socket.on(SOCKET_EVENTS.OPTIMIZER_RUN, async ({ action }) => {
        await this.runOptimizerAction(action)
      })

      socket.on(SOCKET_EVENTS.DASHBOARD_REQUEST_SNAPSHOT, () => {
        this.pushSnapshot(socket.id)
      })

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`)
      })
    })
  }

  private startPollingLoops(): void {
    this.safeLoop(() => this.updateDevices(), POLLING_INTERVALS.DEVICES_MS)
    this.safeLoop(() => this.updateMetrics(), POLLING_INTERVALS.METRICS_MS)
    this.safeLoop(() => this.updateProcesses(), POLLING_INTERVALS.PROCESSES_MS)
    this.safeLoop(() => this.updateAceleratorInsights(), POLLING_INTERVALS.ACELERATOR_INSIGHTS_MS)
  }

  private safeLoop(task: () => Promise<void>, intervalMs: number): void {
    task().catch((error) => {
      this.emitError(error instanceof Error ? error.message : 'Unknown task error')
    })

    setInterval(() => {
      task().catch((error) => {
        this.emitError(error instanceof Error ? error.message : 'Unknown task error')
      })
    }, intervalMs)
  }

  private async updateMetrics(): Promise<void> {
    const connectedDevices = this.scannerService.getCached().filter((d) => d.online).length
    const metrics = await this.metricsService.collect(connectedDevices)

    this.history.push({
      timestamp: metrics.timestamp,
      downloadMbps: metrics.downloadMbps,
      uploadMbps: metrics.uploadMbps,
      pingMs: metrics.pingMs,
      healthScore: metrics.healthScore,
    })

    if (this.history.length > 40) {
      this.history.shift()
    }

    this.io.emit(SOCKET_EVENTS.METRICS_UPDATE, metrics)
    this.io.emit(SOCKET_EVENTS.METRICS_HISTORY, this.history)
  }

  private async updateDevices(): Promise<void> {
    const devices = await this.scannerService.scan()
    this.io.emit(SOCKET_EVENTS.DEVICES_UPDATE, devices)
  }

  private async updateProcesses(): Promise<void> {
    const processes = await this.processService.collect()
    this.io.emit(SOCKET_EVENTS.PROCESSES_UPDATE, processes)
  }

  private async updateAceleratorInsights(): Promise<void> {
    const recommendations = this.aceleratorInsightsService.analyze({
      metrics: this.metricsService.getLatest(),
      devices: this.scannerService.getCached(),
      processes: this.processService.getCached(),
    })

    this.io.emit(SOCKET_EVENTS.ACELERATOR_INSIGHTS_UPDATE, recommendations)
  }

  private async runOptimizerAction(action: OptimizationAction): Promise<void> {
    this.io.emit(SOCKET_EVENTS.SERVER_LOG, {
      level: 'info',
      message: `Running optimization action: ${action}`,
      timestamp: Date.now(),
    })

    const result = await this.optimizerService.run(action)
    this.io.emit(SOCKET_EVENTS.OPTIMIZER_RESULT, result)

    const errorSummary = result.output
      .trim()
      .split('\n')
      .find((line) => line.trim().length > 0)
      ?.trim()

    this.io.emit(SOCKET_EVENTS.SERVER_LOG, {
      level: result.success ? 'info' : 'error',
      message: result.success
        ? `${action} completed in ${result.durationMs}ms`
        : `${action} failed in ${result.durationMs}ms (${errorSummary ?? 'No error details'})`,
      timestamp: Date.now(),
    })
  }

  private pushSnapshot(socketId: string): void {
    const socket = this.io.sockets.sockets.get(socketId)
    if (!socket) return

    const latestMetrics = this.metricsService.getLatest()
    if (latestMetrics) {
      socket.emit(SOCKET_EVENTS.METRICS_UPDATE, latestMetrics)
    }

    socket.emit(SOCKET_EVENTS.METRICS_HISTORY, this.history)
    socket.emit(SOCKET_EVENTS.DEVICES_UPDATE, this.scannerService.getCached())
    socket.emit(SOCKET_EVENTS.PROCESSES_UPDATE, this.processService.getCached())

    const recommendations = this.aceleratorInsightsService.analyze({
      metrics: latestMetrics,
      devices: this.scannerService.getCached(),
      processes: this.processService.getCached(),
    })

    socket.emit(SOCKET_EVENTS.ACELERATOR_INSIGHTS_UPDATE, recommendations)
  }

  private emitError(message: string): void {
    logger.error(message)
    this.io.emit(SOCKET_EVENTS.SERVER_ERROR, { message })
  }
}
