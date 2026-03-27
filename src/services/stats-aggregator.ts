import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ADHD_DEV_HOME } from '../core/paths.js';
import type { DailyStats } from '../models/types.js';

const STATS_DIR = join(ADHD_DEV_HOME, 'stats');

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function statsFilePath(date: string): string {
  return join(STATS_DIR, `${date}.json`);
}

function ensureStatsDir(): void {
  if (!existsSync(STATS_DIR)) {
    mkdirSync(STATS_DIR, { recursive: true });
  }
}

function readStatsFile(date: string): DailyStats {
  const filePath = statsFilePath(date);
  if (!existsSync(filePath)) {
    return { focusMinutes: 0, completedSessions: 0, date };
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as DailyStats;
  } catch {
    return { focusMinutes: 0, completedSessions: 0, date };
  }
}

function writeStatsFile(stats: DailyStats): void {
  ensureStatsDir();
  writeFileSync(statsFilePath(stats.date), JSON.stringify(stats, null, 2), 'utf-8');
}

export function recordCompletedSession(minutes: number): DailyStats {
  const date = todayDateString();
  const stats = readStatsFile(date);
  const updated: DailyStats = {
    date,
    focusMinutes: stats.focusMinutes + minutes,
    completedSessions: stats.completedSessions + 1,
  };
  writeStatsFile(updated);
  return updated;
}

export function getTodayStats(): DailyStats {
  const date = todayDateString();
  return readStatsFile(date);
}
