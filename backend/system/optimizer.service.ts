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

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
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
    const commands = this.getCommands(platform, action)

    if (!commands.length) {
      throw new Error(`No command mapped for ${action} on ${platform}`)
    }

    const outputs: string[] = []
    for (const command of commands) {
      const { stdout, stderr } = await execAsync(command)
      outputs.push(`$ ${command}\n${stdout || ''}${stderr || ''}`.trim())
    }

    return outputs.join('\n\n')
  }

  private async runTurboBoost(): Promise<string> {
    const startedAt = Date.now()
    const steps: Array<{ action: SystemOptimizationAction; label: string }> = [
      { action: 'flush_dns', label: 'Flush DNS' },
      { action: 'clear_network_cache', label: 'Limpiar cache de red' },
      { action: 'renew_ip', label: 'Renovar IP' },
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
        await this.runSystemAction(step.action)
        successCount += 1
        report.push(`${step.label}: ok`)
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
    let result: Awaited<ReturnType<typeof speedTest>>

    try {
      result = await speedTest({
        acceptLicense: true,
        acceptGdpr: true,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown speed test error'
      throw new Error(`Speed test failed: ${message}`)
    }

    const downloadBandwidth = toFiniteNumber(result?.download?.bandwidth)
    const uploadBandwidth = toFiniteNumber(result?.upload?.bandwidth)
    const pingLatency = toFiniteNumber(result?.ping?.latency)

    if (downloadBandwidth === null || uploadBandwidth === null || pingLatency === null) {
      throw new Error('Speed test failed: incomplete measurement data from provider')
    }

    const serverName = typeof result?.server?.name === 'string' ? result.server.name : 'Unknown'
    const serverLocation =
      typeof result?.server?.location === 'string' ? result.server.location : 'Unknown'
    const isp = typeof result?.isp === 'string' ? result.isp : 'Unknown ISP'

    return {
      server: `${serverName} (${serverLocation})`,
      isp,
      downloadMbps: (downloadBandwidth * 8) / 1_000_000,
      uploadMbps: (uploadBandwidth * 8) / 1_000_000,
      pingMs: pingLatency,
    }
  }

  private formatSpeedSnapshot(snapshot: SpeedSnapshot): string {
    return `Download ${snapshot.downloadMbps.toFixed(2)} Mbps | Upload ${snapshot.uploadMbps.toFixed(2)} Mbps | Ping ${snapshot.pingMs.toFixed(1)} ms`
  }

  private getCommands(platform: NodeJS.Platform, action: SystemOptimizationAction): string[] {
    const commandMap: Record<
      SystemOptimizationAction,
      Partial<Record<NodeJS.Platform, string[]>>
    > = {
      flush_dns: {
        darwin: ['dscacheutil -flushcache', 'sudo killall -HUP mDNSResponder'],
        win32: ['ipconfig /flushdns'],
      },
      renew_ip: {
        darwin: ['ipconfig set en0 DHCP'],
        win32: ['ipconfig /release', 'ipconfig /renew'],
      },
      clear_network_cache: {
        darwin: ['sudo route -n flush'],
        win32: ['netsh int ip reset', 'netsh winsock reset'],
      },
      restart_adapter: {
        darwin: ['networksetup -setairportpower en0 off', 'networksetup -setairportpower en0 on'],
        win32: [
          'netsh interface set interface name=\"Wi-Fi\" admin=disable',
          'netsh interface set interface name=\"Wi-Fi\" admin=enable',
        ],
      },
    }

    return commandMap[action][platform] ?? []
  }
}
