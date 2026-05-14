import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import speedTest from 'speedtest-net';
import { OptimizationAction, OptimizationActionResult } from '../../shared/types/network';

const execAsync = promisify(exec)

type SystemOptimizationAction = Exclude<OptimizationAction, 'speed_test' | 'turbo_boost'>

interface SpeedSnapshot {
  server: string
  isp: string
  downloadMbps: number
  uploadMbps: number
  pingMs: number
}

interface MacWifiContext {
  device: string
  service: string
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export class OptimizerService {
  async run(action: OptimizationAction): Promise<OptimizationActionResult> {
    const start = Date.now()

    try {
      const output = await this.runByPlatform(action)
      return {
        action,
        success: true,
        output,
        durationMs: Date.now() - start,
        timestamp: Date.now(),
      }
    } catch (error) {
      return {
        action,
        success: false,
        output: error instanceof Error ? error.message : 'Unknown optimizer error',
        durationMs: Date.now() - start,
        timestamp: Date.now(),
      }
    }
  }

  private async runByPlatform(action: OptimizationAction): Promise<string> {
    if (action === 'turbo_boost') {
      return this.runTurboBoost()
    }

    if (action === 'speed_test') {
      return this.runSpeedTest()
    }

    return this.runSystemAction(action)
  }

  private async runSystemAction(action: SystemOptimizationAction): Promise<string> {
    const platform = process.platform
    const commands = await this.getCommands(platform, action)

    if (!commands.length) {
      throw new Error(`No command mapped for ${action} on ${platform}`)
    }

    let successCount = 0
    const outputs: string[] = []

    for (const command of commands) {
      const result = await this.runCommand(command)
      if (result.success) {
        successCount += 1
      }
      outputs.push(result.output)
    }

    if (successCount === 0) {
      throw new Error(outputs.join('\n\n'))
    }

    return [
      `${successCount}/${commands.length} comandos ejecutados correctamente.`,
      ...outputs,
    ].join('\n\n')
  }

  private async runTurboBoost(): Promise<string> {
    const startedAt = Date.now()
    const steps: Array<{ action: SystemOptimizationAction; label: string }> = [
      { action: 'flush_dns', label: 'Flush DNS' },
      { action: 'clear_network_cache', label: 'Limpiar cache de red' },
      { action: 'renew_ip', label: 'Renovar IP' },
      { action: 'restart_adapter', label: 'Reiniciar adaptador' },
    ]

    let baseline: SpeedSnapshot | null = null
    let finalSnapshot: SpeedSnapshot | null = null
    const report: string[] = []
    let successCount = 0

    try {
      baseline = await this.runSpeedTestSnapshot()
      report.push(`Linea base de red: ${this.formatSpeedSnapshot(baseline)}`)
    } catch (error) {
      report.push(
        `Linea base no disponible: ${error instanceof Error ? error.message : 'Unknown baseline error'}`,
      )
    }

    for (const step of steps) {
      try {
        const stepOutput = await this.runSystemAction(step.action)
        successCount += 1
        report.push(`${step.label}: ok`)
        report.push(stepOutput)
      } catch (error) {
        report.push(
          `${step.label}: fallo (${error instanceof Error ? error.message : 'Unknown command error'})`,
        )
      }
    }

    try {
      finalSnapshot = await this.runSpeedTestSnapshot()
      successCount += 1
      report.push(`Resultado final: ${this.formatSpeedSnapshot(finalSnapshot)}`)
    } catch (error) {
      report.push(
        `Resultado final no disponible: ${error instanceof Error ? error.message : 'Unknown final speed test error'}`,
      )
    }

    if (baseline && finalSnapshot) {
      const downloadDelta = finalSnapshot.downloadMbps - baseline.downloadMbps
      const uploadDelta = finalSnapshot.uploadMbps - baseline.uploadMbps
      const pingDelta = finalSnapshot.pingMs - baseline.pingMs

      report.push(
        `Mejora estimada => Download ${downloadDelta >= 0 ? '+' : ''}${downloadDelta.toFixed(2)} Mbps | Upload ${uploadDelta >= 0 ? '+' : ''}${uploadDelta.toFixed(2)} Mbps | Ping ${pingDelta >= 0 ? '+' : ''}${pingDelta.toFixed(1)} ms`,
      )
    }

    report.push(`Turbo Boost completado en ${Date.now() - startedAt}ms.`)

    if (successCount === 0) {
      throw new Error(report.join('\n'))
    }

    return report.join('\n')
  }

  private async runSpeedTest(): Promise<string> {
    const snapshot = await this.runSpeedTestSnapshot()

    return [
      `Server: ${snapshot.server}`,
      `ISP: ${snapshot.isp}`,
      `Download: ${snapshot.downloadMbps.toFixed(2)} Mbps`,
      `Upload: ${snapshot.uploadMbps.toFixed(2)} Mbps`,
      `Ping: ${snapshot.pingMs.toFixed(1)} ms`,
    ].join('\n')
  }

  private async runSpeedTestSnapshot(): Promise<SpeedSnapshot> {
    let result: unknown

    try {
      result = await this.executeSpeedTestSafely()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown speed test error'
      throw new Error(`Speed test failed: ${message}`)
    }

    if (!isObject(result)) {
      throw new Error('Speed test failed: invalid response payload')
    }

    const download = isObject(result.download) ? result.download : null
    const upload = isObject(result.upload) ? result.upload : null
    const ping = isObject(result.ping) ? result.ping : null
    const server = isObject(result.server) ? result.server : null

    const downloadBandwidth = toFiniteNumber(download?.bandwidth)
    const uploadBandwidth = toFiniteNumber(upload?.bandwidth)
    const pingLatency = toFiniteNumber(ping?.latency)

    if (downloadBandwidth === null || uploadBandwidth === null || pingLatency === null) {
      throw new Error('Speed test failed: incomplete measurement data from provider')
    }

    const serverName = typeof server?.name === 'string' ? server.name : 'Unknown'
    const serverLocation = typeof server?.location === 'string' ? server.location : 'Unknown'
    const isp = typeof result.isp === 'string' ? result.isp : 'Unknown ISP'

    return {
      server: `${serverName} (${serverLocation})`,
      isp,
      downloadMbps: (downloadBandwidth * 8) / 1_000_000,
      uploadMbps: (uploadBandwidth * 8) / 1_000_000,
      pingMs: pingLatency,
    }
  }

  private async executeSpeedTestSafely(): Promise<unknown> {
    const probe = speedTest({
      acceptLicense: true,
      acceptGdpr: true,
    }) as unknown

    if (!isObject(probe) || typeof probe.then !== 'function' || typeof probe.on !== 'function') {
      return probe
    }

    return await new Promise((resolve, reject) => {
      const eventSource = probe as {
        then: (
          onFulfilled: (value: unknown) => void,
          onRejected?: (reason: unknown) => void,
        ) => void
        on: (eventName: string, handler: (value: unknown) => void) => void
      }

      let settled = false
      const settleResolve = (value: unknown) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      const settleReject = (reason: unknown) => {
        if (settled) return
        settled = true
        reject(reason)
      }

      eventSource.on('error', settleReject)
      eventSource.on('data', settleResolve)
      eventSource.then(settleResolve, settleReject)
    })
  }

  private formatSpeedSnapshot(snapshot: SpeedSnapshot): string {
    return `Download ${snapshot.downloadMbps.toFixed(2)} Mbps | Upload ${snapshot.uploadMbps.toFixed(2)} Mbps | Ping ${snapshot.pingMs.toFixed(1)} ms`
  }

  private async runCommand(command: string): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 20_000 })
      const body = `${stdout || ''}${stderr || ''}`.trim()
      return {
        success: true,
        output: `[ok] $ ${command}${body ? `\n${body}` : ''}`,
      }
    } catch (error) {
      const typedError = error as Error & { stdout?: string; stderr?: string }
      const details = `${typedError.stdout || ''}${typedError.stderr || ''}`.trim()
      const message = details || typedError.message || 'Unknown command error'

      return {
        success: false,
        output: `[fail] $ ${command}\n${message}`,
      }
    }
  }

  private async resolveMacWifiContext(): Promise<MacWifiContext> {
    const fallback: MacWifiContext = {
      device: 'en0',
      service: 'Wi-Fi',
    }

    try {
      const { stdout } = await execAsync('networksetup -listallhardwareports', { timeout: 10_000 })
      const lines = stdout.split('\n')

      let currentPort: string | null = null
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) {
          currentPort = null
          continue
        }

        if (line.startsWith('Hardware Port:')) {
          currentPort = line.replace('Hardware Port:', '').trim()
          continue
        }

        if (line.startsWith('Device:') && currentPort) {
          const device = line.replace('Device:', '').trim()
          const normalizedPort = currentPort.toLowerCase()
          if (
            normalizedPort.includes('wi-fi') ||
            normalizedPort.includes('wifi') ||
            normalizedPort.includes('airport')
          ) {
            return {
              device,
              service: currentPort,
            }
          }
        }
      }
    } catch {
      return fallback
    }

    return fallback
  }

  private async getCommands(
    platform: NodeJS.Platform,
    action: SystemOptimizationAction,
  ): Promise<string[]> {
    if (platform === 'darwin') {
      const wifi = await this.resolveMacWifiContext()

      const darwinCommandMap: Record<SystemOptimizationAction, string[]> = {
        flush_dns: ['dscacheutil -flushcache', 'killall -HUP mDNSResponder'],
        renew_ip: [`ipconfig set ${wifi.device} DHCP`, `networksetup -renewdhcp "${wifi.service}"`],
        clear_network_cache: [
          'route -n flush',
          'arp -a -d',
          'dscacheutil -flushcache',
          'killall -HUP mDNSResponder',
        ],
        restart_adapter: [
          `networksetup -setairportpower ${wifi.device} off`,
          `networksetup -setairportpower ${wifi.device} on`,
        ],
      }

      return darwinCommandMap[action] ?? []
    }

    const commandMap: Record<
      SystemOptimizationAction,
      Partial<Record<NodeJS.Platform, string[]>>
    > = {
      flush_dns: {
        win32: ['ipconfig /flushdns'],
      },
      renew_ip: {
        win32: ['ipconfig /release', 'ipconfig /renew'],
      },
      clear_network_cache: {
        win32: ['netsh int ip reset', 'netsh winsock reset'],
      },
      restart_adapter: {
        win32: [
          'netsh interface set interface name=\"Wi-Fi\" admin=disable',
          'netsh interface set interface name=\"Wi-Fi\" admin=enable',
        ],
      },
    }

    return commandMap[action][platform] ?? []
  }
}
