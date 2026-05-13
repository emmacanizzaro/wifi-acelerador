import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'wifi-acelerator.log')

function persistLog(line: string): void {
  try {
    mkdirSync(LOG_DIR, { recursive: true })
    appendFileSync(LOG_FILE, `${line}\n`, { encoding: 'utf-8' })
  } catch {
    // Avoid breaking app flow if file logging is unavailable.
  }
}

export class LoggerService {
  info(message: string): void {
    // Keep logs structured for terminal and UI streaming.
    const line = `[INFO] ${new Date().toISOString()} ${message}`
    console.log(line)
    persistLog(line)
  }

  warn(message: string): void {
    const line = `[WARN] ${new Date().toISOString()} ${message}`
    console.warn(line)
    persistLog(line)
  }

  error(message: string): void {
    const line = `[ERROR] ${new Date().toISOString()} ${message}`
    console.error(line)
    persistLog(line)
  }
}

export const logger = new LoggerService()
