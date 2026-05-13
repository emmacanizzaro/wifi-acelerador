import { DeviceInfo } from '../../../shared/types/network';

interface DevicesTableProps {
  devices: DeviceInfo[]
}

export function DevicesTable({ devices }: DevicesTableProps): JSX.Element {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <p className="metric-label text-xs uppercase tracking-[0.16em] text-slate-400">Escaner LAN</p>
      {devices.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Aun no hay dispositivos detectados.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="pb-2 pr-4 font-medium">IP</th>
                <th className="pb-2 pr-4 font-medium">Nombre</th>
                <th className="pb-2 pr-4 font-medium">MAC</th>
                <th className="pb-2 pr-4 font-medium">Fabricante</th>
                <th className="pb-2 pr-4 font-medium">Estado</th>
                <th className="pb-2 font-medium">Ping</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr
                  key={`${device.ip}-${device.mac}`}
                  className="border-b border-white/5 text-slate-200"
                >
                  <td className="py-2 pr-4">{device.ip}</td>
                  <td className="py-2 pr-4">{device.hostname}</td>
                  <td className="py-2 pr-4">{device.mac}</td>
                  <td className="py-2 pr-4">{device.vendor}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${device.online ? 'bg-accent/20 text-accent' : 'bg-danger/20 text-danger'}`}
                    >
                      {device.online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="py-2">{device.responseTimeMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
