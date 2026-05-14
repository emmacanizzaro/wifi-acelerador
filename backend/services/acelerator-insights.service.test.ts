import assert from 'node:assert/strict';
import test from 'node:test';
import { DeviceInfo, NetworkMetrics, ProcessUsage } from '../../shared/types/network';
import { AceleratorInsightsService } from './acelerator-insights.service';

function createMetrics(overrides: Partial<NetworkMetrics> = {}): NetworkMetrics {
  return {
    timestamp: Date.now(),
    downloadMbps: 40,
    uploadMbps: 8,
    pingMs: 28,
    jitterMs: 4,
    connectedDevices: 4,
    estimatedBandwidthUsageMbps: 2,
    healthScore: 86,
    healthStatus: 'excellent',
    ...overrides,
  }
}

function createDevice(index: number): DeviceInfo {
  return {
    ip: `192.168.1.${index + 10}`,
    hostname: `device-${index}`,
    mac: `00:11:22:33:44:${String(index).padStart(2, '0')}`,
    vendor: 'test-vendor',
    online: true,
    responseTimeMs: 5,
    lastSeen: Date.now(),
  }
}

function createProcess(overrides: Partial<ProcessUsage> = {}): ProcessUsage {
  return {
    pid: 101,
    name: 'backup-sync',
    activeConnections: 12,
    estimatedUsageScore: 12,
    ...overrides,
  }
}

test('reports transient spike first and escalates only when issue persists', () => {
  const service = new AceleratorInsightsService()

  const first = service.analyze({
    metrics: createMetrics({ pingMs: 110, jitterMs: 24, healthScore: 52, healthStatus: 'warning' }),
    devices: [],
    processes: [],
  })

  assert.ok(!first.some((item) => item.id === 'latency-high'))
  assert.ok(first.length > 0)

  const second = service.analyze({
    metrics: createMetrics({
      pingMs: 145,
      jitterMs: 39,
      healthScore: 33,
      healthStatus: 'critical',
    }),
    devices: [],
    processes: [],
  })

  assert.ok(second.some((item) => item.level === 'warning' || item.level === 'critical'))
})

test('detects upload saturation root cause with heavy local process', () => {
  const service = new AceleratorInsightsService()

  service.analyze({
    metrics: createMetrics({
      uploadMbps: 1.2,
      estimatedBandwidthUsageMbps: 4.4,
      pingMs: 95,
      jitterMs: 21,
      healthScore: 50,
      healthStatus: 'warning',
    }),
    devices: [createDevice(1), createDevice(2), createDevice(3)],
    processes: [createProcess()],
  })

  const second = service.analyze({
    metrics: createMetrics({
      uploadMbps: 1,
      estimatedBandwidthUsageMbps: 4.9,
      pingMs: 99,
      jitterMs: 23,
      healthScore: 45,
      healthStatus: 'warning',
    }),
    devices: [createDevice(1), createDevice(2), createDevice(3)],
    processes: [createProcess({ estimatedUsageScore: 14 })],
  })

  assert.ok(second.some((item) => item.id === 'root-cause-upload-saturation'))
})

test('marks stable network when no sustained incident exists', () => {
  const service = new AceleratorInsightsService()

  const recommendations = service.analyze({
    metrics: createMetrics(),
    devices: [createDevice(1)],
    processes: [createProcess({ estimatedUsageScore: 3, name: 'finder', activeConnections: 2 })],
  })

  const stable = recommendations.find((item) => item.id === 'network-stable')
  assert.ok(stable)
  assert.ok(typeof stable.telemetry?.incidentScore === 'number')
  assert.ok(
    stable.telemetry?.trend === 'stable' ||
      stable.telemetry?.trend === 'improving' ||
      stable.telemetry?.trend === 'degrading',
  )
})
