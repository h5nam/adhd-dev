import {
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { ADHD_DEV_EVENTS_LOG, ADHD_DEV_HOME } from '../core/paths.js';
import { logger } from '../core/logger.js';

const STATS_DIR = join(ADHD_DEV_HOME, 'stats');
const MAX_EVENTS_LOG_BYTES = 1024 * 1024; // 1 MB

export function purgeOldData(retentionDays: number): void {
  if (!existsSync(STATS_DIR)) return;

  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  try {
    const entries = readdirSync(STATS_DIR);
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const filePath = join(STATS_DIR, entry);
      try {
        const st = statSync(filePath);
        if (st.mtimeMs < cutoffMs) {
          unlinkSync(filePath);
          deleted++;
        }
      } catch {
        // skip files we can't stat
      }
    }
  } catch {
    // stats dir unreadable
  }

  if (deleted > 0) {
    logger.info(`data-purger: deleted ${deleted} stats file(s) older than ${retentionDays} days`);
  }
}

export function purgeEventLog(): void {
  if (!existsSync(ADHD_DEV_EVENTS_LOG)) return;

  try {
    const st = statSync(ADHD_DEV_EVENTS_LOG);
    if (st.size <= MAX_EVENTS_LOG_BYTES) return;

    // Keep the most recent half of the file by line count
    const content = readFileSync(ADHD_DEV_EVENTS_LOG, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    const keep = lines.slice(Math.floor(lines.length / 2));
    writeFileSync(ADHD_DEV_EVENTS_LOG, keep.join('\n') + '\n', 'utf-8');
    logger.info(`data-purger: truncated events.jsonl from ${lines.length} to ${keep.length} lines`);
  } catch {
    // silently ignore
  }
}
