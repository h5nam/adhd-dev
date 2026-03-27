import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ADHD_DEV_LOG_FILE } from './paths.js';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${metaStr}\n`;
}

function writeLog(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;

  const formatted = formatMessage(level, message, meta);

  try {
    const dir = dirname(ADHD_DEV_LOG_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(ADHD_DEV_LOG_FILE, formatted);
  } catch {
    // Silently fail — logging should never crash the app
  }
}

export const logger = {
  error: (message: string, meta?: unknown) => writeLog('error', message, meta),
  warn: (message: string, meta?: unknown) => writeLog('warn', message, meta),
  info: (message: string, meta?: unknown) => writeLog('info', message, meta),
  debug: (message: string, meta?: unknown) => writeLog('debug', message, meta),
};
