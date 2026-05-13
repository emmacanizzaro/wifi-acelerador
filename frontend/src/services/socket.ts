import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/socket';

const backendPort = Number(import.meta.env.VITE_BACKEND_PORT ?? 4000)

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  `http://localhost:${backendPort}`,
  {
    transports: ['websocket', 'polling'],
    autoConnect: true,
  },
)
