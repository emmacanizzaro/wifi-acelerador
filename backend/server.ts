import cors from 'cors';
import express from 'express';
import http from 'node:http';
import { logger } from './services/logger';
import { SocketGateway } from './socket/socket.gateway';

export interface StartedServer {
  app: express.Express
  server: http.Server
}

export async function startBackendServer(
  port = Number(process.env.ELECTRON_BACKEND_PORT ?? 4000),
): Promise<StartedServer> {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res
      .status(200)
      .json({ status: 'ok', service: 'wifi-acelerator-backend', timestamp: Date.now() })
  })

  const server = http.createServer(app)
  new SocketGateway(server)

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      logger.info(`Backend listening on http://localhost:${port}`)
      resolve()
    })
  })

  return { app, server }
}

if (require.main === module) {
  startBackendServer().catch((error) => {
    logger.error(
      error instanceof Error ? (error.stack ?? error.message) : 'Unknown server bootstrap error',
    )
    process.exit(1)
  })
}
