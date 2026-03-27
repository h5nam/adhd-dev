import { writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ADHD_DEV_PID_FILE, ADHD_DEV_HOME } from '../core/paths.js';
import { logger } from '../core/logger.js';
import { startIpcServer, stopIpcServer } from './ipc-server.js';
import { startWatching, stopWatching } from './file-watcher.js';
import { tick } from '../services/dopamine-service.js';
import { purgeOldData, purgeEventLog } from '../services/data-purger.js';
import { loadConfig } from '../core/config.js';

const TICK_INTERVAL_MS = 10_000; // 10 seconds

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function writePidFile(): void {
  ensureDir(ADHD_DEV_PID_FILE);
  writeFileSync(ADHD_DEV_PID_FILE, String(process.pid), 'utf-8');
  logger.info('daemon: wrote PID file', { pid: process.pid });
}

function removePidFile(): void {
  try {
    if (existsSync(ADHD_DEV_PID_FILE)) {
      unlinkSync(ADHD_DEV_PID_FILE);
      logger.info('daemon: removed PID file');
    }
  } catch {
    // ignore
  }
}

function ensureHomeDir(): void {
  if (!existsSync(ADHD_DEV_HOME)) {
    mkdirSync(ADHD_DEV_HOME, { recursive: true });
  }
}

let tickInterval: ReturnType<typeof setInterval> | null = null;
let lastPurgeAt = 0;

async function shutdown(signal: string): Promise<void> {
  logger.info(`daemon: received ${signal}, shutting down`);

  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }

  await stopWatching();
  await stopIpcServer();
  removePidFile();

  logger.info('daemon: shutdown complete');
  process.exit(0);
}

function scheduleDailyPurge(): void {
  const now = Date.now();
  const config = loadConfig();

  // Run if last purge was more than 24h ago
  if (now - lastPurgeAt > 24 * 60 * 60 * 1000) {
    lastPurgeAt = now;
    purgeOldData(config.data.retentionDays);
    purgeEventLog();
    logger.info('daemon: daily purge complete');
  }

  // Schedule next purge at midnight
  const msUntilMidnight = (): number => {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow.getTime() - Date.now();
  };

  setTimeout(() => {
    scheduleDailyPurge();
  }, msUntilMidnight());
}

async function main(): Promise<void> {
  ensureHomeDir();
  writePidFile();

  logger.info('daemon: starting', { pid: process.pid });

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await startIpcServer();
    startWatching();

    // Periodic tick for timer updates
    tickInterval = setInterval(() => {
      try {
        tick();
      } catch (err) {
        logger.error('daemon: tick error', err);
      }
    }, TICK_INTERVAL_MS);

    scheduleDailyPurge();

    logger.info('daemon: ready');
  } catch (err) {
    logger.error('daemon: failed to start', err);
    removePidFile();
    process.exit(1);
  }
}

void main();
