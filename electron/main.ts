import { app, BrowserWindow, shell } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';

let mainWindow: BrowserWindow | null = null
let backendProcess: ReturnType<typeof spawn> | null = null

function startBackendIfNeeded(): void {
  if (process.env.ELECTRON_RENDERER_URL) return

  const backendEntry = path.resolve(__dirname, '../backend/server.js')
  backendProcess = spawn(process.execPath, [backendEntry], {
    env: {
      ...process.env,
      ELECTRON_BACKEND_PORT: process.env.ELECTRON_BACKEND_PORT ?? '4000',
    },
    stdio: 'inherit',
  })
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    title: 'Wifi Acelerator',
    backgroundColor: '#070b12',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devUrl = process.env.ELECTRON_RENDERER_URL

  if (devUrl) {
    await mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexPath = path.resolve(__dirname, '../frontend/index.html')
    await mainWindow.loadFile(indexPath)
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  startBackendIfNeeded()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
