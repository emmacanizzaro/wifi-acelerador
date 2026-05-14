import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Server as HttpServer } from 'node:http';
import path from 'node:path';
import { Server } from 'socket.io';
import { POLLING_INTERVALS, SOCKET_EVENTS } from '../../shared/constants/network';
import {
    AutoRecoverySettings,
    HistoricalPoint,
    OptimizationAction,
} from '../../shared/types/network';
import { ClientToServerEvents, ServerToClientEvents } from '../../shared/types/socket';
import { MetricsService } from '../network/metrics.service';
import { LanScannerService } from '../scanner/lan-scanner.service';
import { AceleratorInsightsService } from '../services/acelerator-insights.service';
import { logger } from '../services/logger';
import { OptimizerService } from '../system/optimizer.service';
import { ProcessUsageService } from '../system/process-usage.service';

export class SocketGateway {
  private static readonly AUTO_RECOVERY_SETTINGS_FILE = path.resolve(
    process.cwd(),
    'logs',
    'auto-recovery-settings.json',
  )

  private static readonly DEFAULT_AUTO_RECOVERY_SETTINGS: AutoRecoverySettings = {
    enabled: true,
    healthThreshold: 38,
    pingThreshold: 95,
    jitterThreshold: 24,
    cooldownMs: 3 * 60 * 1000,
  }

  private readonly metricsService = new MetricsService()
  private readonly scannerService = new LanScannerService()
  private readonly processService = new ProcessUsageService()
  private readonly optimizerService = new OptimizerService()
  private readonly aceleratorInsightsService = new AceleratorInsightsService()

  private readonly history: HistoricalPoint[] = []
  private io: Server<ClientToServerEvents, ServerToClientEvents>
  private optimizerRunning = false
  private lastAutoRecoveryAt = 0
  private autoRecoverySettings: AutoRecoverySettings = {
    ...SocketGateway.DEFAULT_AUTO_RECOVERY_SETTINGS,
  }

  constructor(server: HttpServer) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
      cors: {
        origin: '*',
      },
    })

    this.autoRecoverySettings = this.loadPersistedAutoRecoverySettings()

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

      socket.on(SOCKET_EVENTS.AUTO_RECOVERY_UPDATE_SETTINGS, (payload) => {
        this.updateAutoRecoverySettings(payload)
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

    await this.tryAutoRecovery(metrics)
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

  private async runOptimizerAction(
    action: OptimizationAction,
    source: 'manual' | 'auto-recovery' = 'manual',
  ): Promise<void> {
    if (this.optimizerRunning) {
      this.io.emit(SOCKET_EVENTS.SERVER_LOG, {
        level: 'warn',
        message: `Optimizer busy. Omitted ${action} (${source}).`,
        timestamp: Date.now(),
      })
      return
    }

    this.optimizerRunning = true

    this.io.emit(SOCKET_EVENTS.SERVER_LOG, {
      level: 'info',
      message: `Running optimization action: ${action} (${source})`,
      timestamp: Date.now(),
    })

    try {
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
          ? `${action} completed in ${result.durationMs}ms (${source})`
          : `${action} failed in ${result.durationMs}ms (${source}) (${errorSummary ?? 'No error details'})`,
        timestamp: Date.now(),
      })
    } finally {
      this.optimizerRunning = false
    }
  }

  private async tryAutoRecovery(metrics: {
    healthScore: number
    pingMs: number
    jitterMs: number
  }): Promise<void> {
    if (!this.autoRecoverySettings.enabled) {
      return
    }

    const now = Date.now()
    const inCooldown = now - this.lastAutoRecoveryAt < this.autoRecoverySettings.cooldownMs

    if (inCooldown || this.optimizerRunning) {
      return
    }

    const severeHealth = metrics.healthScore <= this.autoRecoverySettings.healthThreshold
    const severeLatency =
      metrics.pingMs >= this.autoRecoverySettings.pingThreshold ||
      metrics.jitterMs >= this.autoRecoverySettings.jitterThreshold

    if (!severeHealth && !severeLatency) {
      return
    }

    this.lastAutoRecoveryAt = now
    this.io.emit(SOCKET_EVENTS.SERVER_LOG, {
      level: 'warn',
      message: `Auto-recovery triggered (health=${metrics.healthScore}, ping=${metrics.pingMs}, jitter=${metrics.jitterMs}).`,
      timestamp: now,
    })

    await this.runOptimizerAction('turbo_boost', 'auto-recovery')
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
    socket.emit(SOCKET_EVENTS.AUTO_RECOVERY_SETTINGS, this.autoRecoverySettings)

    const recommendations = this.aceleratorInsightsService.analyze({
      metrics: latestMetrics,
      devices: this.scannerService.getCached(),
      processes: this.processService.getCached(),
    })

    socket.emit(SOCKET_EVENTS.ACELERATOR_INSIGHTS_UPDATE, recommendations)
  }

  private updateAutoRecoverySettings(payload: Partial<AutoRecoverySettings>): void {
    const current = this.autoRecoverySettings
    const next: AutoRecoverySettings = {
      enabled: typeof payload.enabled === 'boolean' ? payload.enabled : current.enabled,
      healthThreshold: this.clampInt(payload.healthThreshold, 10, 80, current.healthThreshold),
      pingThreshold: this.clampInt(payload.pingThreshold, 20, 250, current.pingThreshold),
      jitterThreshold: this.clampInt(payload.jitterThreshold, 5, 120, current.jitterThreshold),
      cooldownMs: this.clampInt(payload.cooldownMs, 20_000, 15 * 60_000, current.cooldownMs),
    }

    this.autoRecoverySettings = next
    this.persistAutoRecoverySettings(next)
    this.io.emit(SOCKET_EVENTS.AUTO_RECOVERY_SETTINGS, next)
    this.io.emit(SOCKET_EVENTS.SERVER_LOG, {
      level: 'info',
      message: `Auto-recovery settings updated: enabled=${next.enabled}, health<=${next.healthThreshold}, ping>=${next.pingThreshold}, jitter>=${next.jitterThreshold}, cooldown=${Math.round(next.cooldownMs / 1000)}s`,
      timestamp: Date.now(),
    })
  }

  private clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback
    }

    return Math.min(max, Math.max(min, Math.round(value)))
  }

  private normalizeAutoRecoverySettings(
    payload: Partial<AutoRecoverySettings>,
  ): AutoRecoverySettings {
    const defaults = SocketGateway.DEFAULT_AUTO_RECOVERY_SETTINGS

    return {
      enabled: typeof payload.enabled === 'boolean' ? payload.enabled : defaults.enabled,
      healthThreshold: this.clampInt(payload.healthThreshold, 10, 80, defaults.healthThreshold),
      pingThreshold: this.clampInt(payload.pingThreshold, 20, 250, defaults.pingThreshold),
      jitterThreshold: this.clampInt(payload.jitterThreshold, 5, 120, defaults.jitterThreshold),
      cooldownMs: this.clampInt(payload.cooldownMs, 20_000, 15 * 60_000, defaults.cooldownMs),
    }
  }

  private loadPersistedAutoRecoverySettings(): AutoRecoverySettings {
    const filePath = SocketGateway.AUTO_RECOVERY_SETTINGS_FILE

    try {
      const raw = readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<AutoRecoverySettings>
      const normalized = this.normalizeAutoRecoverySettings(parsed)
      logger.info(`Auto-recovery settings loaded from ${filePath}`)
      return normalized
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown settings read error'
      logger.warn(`Auto-recovery settings fallback to defaults (${message})`)
      return { ...SocketGateway.DEFAULT_AUTO_RECOVERY_SETTINGS }
    }
  }

  private persistAutoRecoverySettings(settings: AutoRecoverySettings): void {
    const filePath = SocketGateway.AUTO_RECOVERY_SETTINGS_FILE

    try {
      mkdirSync(path.dirname(filePath), { recursive: true })
      writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown settings write error'
      logger.error(`Failed to persist auto-recovery settings (${message})`)
    }
  }

  private emitError(message: string): void {
    logger.error(message)
    this.io.emit(SOCKET_EVENTS.SERVER_ERROR, { message })
  }
}
