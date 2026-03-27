import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { CLAUDE_SESSIONS_DIR, CLAUDE_PROJECTS_DIR } from '../core/paths.js';
import { encodePath, findProjectDir } from './path-encoder.js';
import type { ClaudeSessionFile, DiscoveredSession, SessionState } from '../models/types.js';

const ACTIVE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes — matches agent-tracker idle threshold

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function deriveProjectName(cwd: string): string {
  const parts = cwd.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? cwd;
}

function readSessionFiles(sessionsDir: string): ClaudeSessionFile[] {
  if (!existsSync(sessionsDir)) return [];

  let entries: string[];
  try {
    entries = readdirSync(sessionsDir);
  } catch {
    return [];
  }

  const sessions: ClaudeSessionFile[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const filePath = join(sessionsDir, entry);
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as ClaudeSessionFile;
      if (
        typeof parsed.pid === 'number' &&
        typeof parsed.sessionId === 'string' &&
        typeof parsed.cwd === 'string' &&
        typeof parsed.startedAt === 'number'
      ) {
        sessions.push(parsed);
      }
    } catch {
      // skip malformed files
    }
  }
  return sessions;
}

export async function discoverSessions(overrideSessionsDir?: string): Promise<DiscoveredSession[]> {
  const sessionsDir = overrideSessionsDir ?? CLAUDE_SESSIONS_DIR;
  const projectsDir = overrideSessionsDir
    ? join(overrideSessionsDir, '..', 'projects')
    : CLAUDE_PROJECTS_DIR;

  const sessionFiles = readSessionFiles(sessionsDir);
  const now = Date.now();
  const discovered: DiscoveredSession[] = [];

  for (const sf of sessionFiles) {
    const pidAlive = isPidAlive(sf.pid);
    const encoded = encodePath(sf.cwd);
    const jsonlPath = join(projectsDir, encoded, `${sf.sessionId}.jsonl`);
    const jsonlExists = existsSync(jsonlPath);

    let state: SessionState;
    let lastActivity: Date | undefined;

    if (!jsonlExists) {
      state = pidAlive ? 'orphan' : 'stale';
    } else {
      try {
        const st = statSync(jsonlPath);
        lastActivity = st.mtime;
        const ageMs = now - st.mtime.getTime();
        if (pidAlive) {
          state = ageMs <= ACTIVE_THRESHOLD_MS ? 'active' : 'idle';
        } else {
          state = 'stale';
        }
      } catch {
        state = pidAlive ? 'orphan' : 'stale';
      }
    }

    discovered.push({
      pid: sf.pid,
      sessionId: sf.sessionId,
      cwd: sf.cwd,
      projectName: deriveProjectName(sf.cwd),
      startedAt: new Date(sf.startedAt),
      state,
      lastActivity,
      jsonlPath: jsonlExists ? jsonlPath : undefined,
    });
  }

  return discovered;
}
