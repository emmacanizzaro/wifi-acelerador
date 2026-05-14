import assert from 'node:assert/strict';
import test from 'node:test';
import { OptimizerService } from './optimizer.service';

test('turbo_boost runs full cleanup pipeline and reports estimated improvement', async () => {
  const optimizer = new OptimizerService() as unknown as {
    run: (action: string) => Promise<{ success: boolean; output: string }>
    runSystemAction: (action: string) => Promise<string>
    runSpeedTestSnapshot: () => Promise<{
      downloadMbps: number
      uploadMbps: number
      pingMs: number
    }>
  }

  const speedSnapshots = [
    { downloadMbps: 120, uploadMbps: 18, pingMs: 24 },
    { downloadMbps: 132, uploadMbps: 21, pingMs: 18 },
  ]

  const executedSteps: string[] = []

  optimizer.runSpeedTestSnapshot = async () => {
    const next = speedSnapshots.shift()
    if (!next) {
      throw new Error('No snapshot available')
    }
    return next
  }

  optimizer.runSystemAction = async (action: string) => {
    executedSteps.push(action)
    return `${action}:ok`
  }

  const result = await optimizer.run('turbo_boost')

  assert.equal(result.success, true)
  assert.deepEqual(executedSteps, [
    'flush_dns',
    'clear_network_cache',
    'renew_ip',
    'restart_adapter',
  ])
  assert.match(
    result.output,
    /Mejora estimada => Download \+12\.00 Mbps \| Upload \+3\.00 Mbps \| Ping -6\.0 ms/,
  )
  assert.match(result.output, /Turbo Boost completado en \d+ms\./)
})
