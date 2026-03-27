import chokidar, { type FSWatcher } from 'chokidar';
import { CLAUDE_SESSIONS_DIR, CLAUDE_PROJECTS_DIR } from '../core/paths.js';
import { discoverSessions } from '../services/claude-session-discovery.js';
import { handleSessionEvent } from '../services/dopamine-service.js';
import { writePromptState } from '../services/signal-emitter.js';
import { logger } from '../core/logger.js';
import type { DiscoveredSession } from '../models/types.js';

const DEBOUNCE_MS = 2000;

let watcher: FSWatcher | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let previousSessions: DiscoveredSession[] = [];

async function runDiscovery(): Promise<void> {
  try {
    const sessions = await discoverSessions();

    // Detect session starts and stops by comparing with previous state
    const prevIds = new Set(previousSessions.map((s) => s.sessionId));
    const currIds = new Set(sessions.map((s) => s.sessionId));

    // New sessions
    for (const session of sessions) {
      if (!prevIds.has(session.sessionId) && session.state === 'active') {
        handleSessionEvent({ type: 'session-start', session });
      }
    }

    // Stopped sessions
    for (const prev of previousSessions) {
      if (!currIds.has(prev.sessionId)) {
        const durationMs = prev.lastActivity
          ? prev.lastActivity.getTime() - prev.startedAt.getTime()
          : 0;
        handleSessionEvent({ type: 'session-stop', session: prev, durationMs });
      }
    }

    // Notify of overall update
    handleSessionEvent({ type: 'sessions-updated', sessions });

    previousSessions = sessions;

    // Update time-of-day in prompt state
    const hour = new Date().getHours();
    const timeOfDay = hour >= 18 ? 'EVE' : hour >= 12 ? 'PM' : 'AM';
    writePromptState({ timeOfDay });
  } catch (err) {
    logger.error('file-watcher: discovery error', err);
  }
}

function scheduleDiscovery(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void runDiscovery();
  }, DEBOUNCE_MS);
}

export function startWatching(): void {
  if (watcher) return;

  logger.info('file-watcher: starting');

  watcher = chokidar.watch(
    [
      `${CLAUDE_SESSIONS_DIR}/*.json`,
      `${CLAUDE_PROJECTS_DIR}/**/*.jsonl`,
    ],
    {
      persistent: true,
      ignoreInitial: false,
      depth: 2,
      usePolling: false,
    },
  );

  watcher.on('add', scheduleDiscovery);
  watcher.on('change', scheduleDiscovery);
  watcher.on('unlink', scheduleDiscovery);
  watcher.on('error', (err) => logger.error('file-watcher: chokidar error', err));
  watcher.on('ready', () => {
    logger.info('file-watcher: ready');
    void runDiscovery();
  });
}

export async function stopWatching(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (watcher) {
    await watcher.close();
    watcher = null;
    logger.info('file-watcher: stopped');
  }
}
