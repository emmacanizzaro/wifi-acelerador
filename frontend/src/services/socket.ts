import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/socket';

const backendPort = Number(import.meta.env.VITE_BACKEND_PORT ?? 4000)
const backendOriginFromEnv = import.meta.env.VITE_BACKEND_ORIGIN as string | undefined

function resolveBackendOrigin(): string {
  if (backendOriginFromEnv && backendOriginFromEnv.trim().length > 0) {
    return backendOriginFromEnv
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${backendPort}`
  }

  return `http://localhost:${backendPort}`
}

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  resolveBackendOrigin(),
  {
    transports: ['websocket', 'polling'],
    autoConnect: true,
  },
)
