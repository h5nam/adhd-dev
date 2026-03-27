import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), 'adhd-dev-stats-test-' + process.pid);

vi.mock('../../src/core/paths.js', async () => {
  const { join: j } = await import('node:path');
  const { tmpdir: t } = await import('node:os');
  const base = j(t(), 'adhd-dev-stats-test-' + process.pid);
  return {
    ADHD_DEV_HOME: base,
    ADHD_DEV_TIMER_STATE: j(base, 'timer-state.json'),
    ADHD_DEV_CONFIG: j(base, 'config.json'),
    ADHD_DEV_DB: j(base, 'data.db'),
    ADHD_DEV_LOG_DIR: j(base, 'logs'),
    ADHD_DEV_LOG_FILE: j(base, 'logs', 'adhd-dev.log'),
    ADHD_DEV_PID_FILE: j(base, 'adhd-dev.pid'),
    ADHD_DEV_SOCKET: j(base, 'adhd-dev.sock'),
    ADHD_DEV_PROMPT_STATE: j(base, 'prompt-state.json'),
    ADHD_DEV_EVENTS_LOG: j(base, 'events.jsonl'),
    ADHD_DEV_HOOKS_DIR: j(base, 'hooks'),
    ADHD_DEV_PATH_CACHE: j(base, 'path-encoding-cache.json'),
    CLAUDE_HOME: j(base, '.claude'),
    CLAUDE_SESSIONS_DIR: j(base, '.claude', 'sessions'),
    CLAUDE_PROJECTS_DIR: j(base, '.claude', 'projects'),
    CLAUDE_SETTINGS: j(base, '.claude', 'settings.json'),
  };
});

import { recordCompletedSession, getTodayStats } from '../../src/services/stats-aggregator.js';

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('stats-aggregator', () => {
  describe('getTodayStats()', () => {
    it('returns zero stats when no sessions recorded', () => {
      const stats = getTodayStats();
      expect(stats.focusMinutes).toBe(0);
      expect(stats.completedSessions).toBe(0);
      expect(stats.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns correct aggregate after recording sessions', () => {
      recordCompletedSession(25);
      recordCompletedSession(30);
      const stats = getTodayStats();
      expect(stats.focusMinutes).toBe(55);
      expect(stats.completedSessions).toBe(2);
    });
  });

  describe('recordCompletedSession()', () => {
    it('adds to today stats', () => {
      const result = recordCompletedSession(25);
      expect(result.focusMinutes).toBe(25);
      expect(result.completedSessions).toBe(1);
    });

    it('accumulates multiple sessions', () => {
      recordCompletedSession(25);
      recordCompletedSession(52);
      const result = recordCompletedSession(10);
      expect(result.focusMinutes).toBe(87);
      expect(result.completedSessions).toBe(3);
    });

    it('stats file is created per day', () => {
      const today = new Date().toISOString().slice(0, 10);
      recordCompletedSession(25);
      const statsFile = join(TEST_DIR, 'stats', `${today}.json`);
      expect(existsSync(statsFile)).toBe(true);
    });

    it('returns the updated stats', () => {
      const stats = recordCompletedSession(45);
      expect(stats.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(stats.focusMinutes).toBe(45);
      expect(stats.completedSessions).toBe(1);
    });
  });
});
