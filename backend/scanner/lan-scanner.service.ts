import wifi from 'node-wifi';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import ping from 'ping';
import si from 'systeminformation';
import { DeviceInfo } from '../../shared/types/network';

const execAsync = promisify(exec)

wifi.init({ iface: null })

function normalizeMac(mac?: string): string {
  if (!mac) return 'Unknown'
  return mac.toUpperCase()
}

function estimateVendor(mac: string): string {
  const oui = mac.slice(0, 8)
  if (oui.startsWith('B8:27:EB')) return 'Raspberry Pi Foundation'
  if (oui.startsWith('3C:5A:B4')) return 'Google / Nest'
  if (oui.startsWith('DC:A6:32')) return 'Apple'
  if (oui.startsWith('FC:FB:FB')) return 'Amazon'
  return 'Generic Vendor'
}

export class LanScannerService {
  private cache: DeviceInfo[] = []

  async scan(): Promise<DeviceInfo[]> {
    const [interfaces, arpTable, wifiConnections] = await Promise.all([
      si.networkInterfaces(),
      this.getArpTable(),
      this.getWifiConnections(),
    ])

    const gateway = wifiConnections[0]?.gateway_ip
    const localIps = interfaces.map((item) => item.ip4).filter(Boolean)

    const records = arpTable
      .filter((entry) => entry.ip && entry.mac)
      .filter((entry) =>
        localIps.some(
          (ip) => entry.ip.split('.').slice(0, 3).join('.') === ip.split('.').slice(0, 3).join('.'),
        ),
      )
      .map((entry) => ({
        ip: entry.ip,
        mac: normalizeMac(entry.mac),
        hostname: entry.name || 'Unknown',
      }))

    if (gateway && !records.find((item) => item.ip === gateway)) {
      records.push({ ip: gateway, mac: 'Unknown', hostname: 'Router / Gateway' })
    }

    const uniqueMap = new Map<string, { ip: string; mac: string; hostname: string }>()
    for (const item of records) uniqueMap.set(item.ip, item)

    const devices = await Promise.all(
      Array.from(uniqueMap.values()).map(async (device) => {
        const probe = await ping.promise.probe(device.ip, { timeout: 1.2 })
        return {
          ip: device.ip,
          hostname: device.hostname,
          mac: device.mac,
          vendor: estimateVendor(device.mac),
          online: Boolean(probe.alive),
          responseTimeMs: Number(probe.time) || 0,
          lastSeen: Date.now(),
        } satisfies DeviceInfo
      }),
    )

    this.cache = devices
    return devices
  }

  getCached(): DeviceInfo[] {
    return this.cache
  }

  private async getArpTable(): Promise<Array<{ ip: string; mac: string; name?: string }>> {
    try {
      const arpModule = await import('arp-a').catch(() => null)
      if (arpModule?.default?.table) {
        const data = await arpModule.default.table()
        return Array.isArray(data) ? data : []
      }

      return this.getArpTableFromSystem()
    } catch {
      return this.getArpTableFromSystem()
    }
  }

  private async getArpTableFromSystem(): Promise<
    Array<{ ip: string; mac: string; name?: string }>
  > {
    try {
      const { stdout } = await execAsync('arp -a')
      const lines = stdout.split('\n')
      const parsed: Array<{ ip: string; mac: string; name?: string }> = []

      for (const line of lines) {
        const match = line.match(/^(.*?)\s+\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-fA-F:]+)/)
        if (!match) continue

        parsed.push({
          name: match[1]?.trim(),
          ip: match[2],
          mac: match[3],
        })
      }

      return parsed
    } catch {
      return []
    }
  }

  private async getWifiConnections(): Promise<Array<{ gateway_ip?: string }>> {
    try {
      const current = await wifi.getCurrentConnections()
      return current as Array<{ gateway_ip?: string }>
    } catch {
      return []
    }
  }
}
