import { createServer, type Server, type Socket } from 'node:net';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { ADHD_DEV_SOCKET, ADHD_DEV_PID_FILE } from '../core/paths.js';
import { handleSessionEvent } from '../services/dopamine-service.js';
import { getStatus as getTimerStatus } from '../services/timer-engine.js';
import { discoverSessions } from '../services/claude-session-discovery.js';
import { logger } from '../core/logger.js';

export type IpcMessageType = 'status' | 'timer-status' | 'sessions' | 'event';

export interface IpcMessage {
  type: IpcMessageType;
  data?: unknown;
}

export interface IpcResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}

let server: Server | null = null;
const daemonStartedAt = Date.now();

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function cleanupStaleSocket(): void {
  if (!existsSync(ADHD_DEV_SOCKET)) return;

  // Check if the PID from pid file is alive
  if (existsSync(ADHD_DEV_PID_FILE)) {
    try {
      const pidStr = readFileSync(ADHD_DEV_PID_FILE, 'utf-8').trim();
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid) && isPidAlive(pid)) {
        // A daemon is already running — do not remove its socket
        return;
      }
    } catch {
      // fall through and remove stale socket
    }
  }

  try {
    unlinkSync(ADHD_DEV_SOCKET);
    logger.info('ipc-server: removed stale socket');
  } catch {
    // ignore
  }
}

async function handleMessage(msg: IpcMessage, socket: Socket): Promise<void> {
  let response: IpcResponse;

  try {
    switch (msg.type) {
      case 'status': {
        const uptimeMs = Date.now() - daemonStartedAt;
        const sessions = await discoverSessions();
        response = {
          ok: true,
          data: {
            pid: process.pid,
            uptimeMs,
            sessionCount: sessions.length,
            activeSessions: sessions.filter((s) => s.state === 'active').length,
            timer: getTimerStatus(),
          },
        };
        break;
      }

      case 'timer-status': {
        response = {
          ok: true,
          data: getTimerStatus(),
        };
        break;
      }

      case 'sessions': {
        const sessions = await discoverSessions();
        response = {
          ok: true,
          data: sessions,
        };
        break;
      }

      case 'event': {
        const eventData = msg.data as Parameters<typeof handleSessionEvent>[0];
        handleSessionEvent(eventData);
        response = { ok: true };
        break;
      }

      default: {
        response = { ok: false, error: `Unknown message type: ${String((msg as IpcMessage).type)}` };
      }
    }
  } catch (err) {
    logger.error('ipc-server: error handling message', err);
    response = { ok: false, error: String(err) };
  }

  try {
    socket.write(JSON.stringify(response) + '\n');
  } catch {
    // client disconnected
  }
}

function handleConnection(socket: Socket): void {
  let buffer = '';

  socket.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg = JSON.parse(trimmed) as IpcMessage;
        void handleMessage(msg, socket);
      } catch {
        socket.write(JSON.stringify({ ok: false, error: 'Invalid JSON' }) + '\n');
      }
    }
  });

  socket.on('error', (err) => {
    logger.debug('ipc-server: socket error', err);
  });

  socket.on('close', () => {
    logger.debug('ipc-server: client disconnected');
  });
}

export function startIpcServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    cleanupStaleSocket();

    server = createServer(handleConnection);

    server.on('error', (err) => {
      logger.error('ipc-server: server error', err);
      reject(err);
    });

    server.listen(ADHD_DEV_SOCKET, () => {
      logger.info('ipc-server: listening', { socket: ADHD_DEV_SOCKET });
      resolve();
    });
  });
}

export function stopIpcServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => {
      server = null;
      try {
        if (existsSync(ADHD_DEV_SOCKET)) unlinkSync(ADHD_DEV_SOCKET);
      } catch {
        // ignore
      }
      logger.info('ipc-server: stopped');
      resolve();
    });
  });
}
