import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), 'adhd-dev-timer-test-' + process.pid);
const TEST_TIMER_STATE = join(TEST_DIR, 'timer-state.json');

vi.mock('../../src/core/paths.js', async () => {
  const { join: j } = await import('node:path');
  const { tmpdir: t } = await import('node:os');
  const base = j(t(), 'adhd-dev-timer-test-' + process.pid);
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

import { start, stop, getStatus, isComplete, readState, writeState, PRESETS } from '../../src/services/timer-engine.js';

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  if (existsSync(TEST_TIMER_STATE)) {
    rmSync(TEST_TIMER_STATE);
  }
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('timer-engine', () => {
  describe('start()', () => {
    it('creates timer state file with correct duration', () => {
      start(25, 'custom');
      expect(existsSync(TEST_TIMER_STATE)).toBe(true);
      const raw = readFileSync(TEST_TIMER_STATE, 'utf-8');
      const state = JSON.parse(raw);
      expect(state.running).toBe(true);
      expect(state.durationMs).toBe(25 * 60 * 1000);
      expect(state.preset).toBe('custom');
      expect(typeof state.startedAt).toBe('number');
    });

    it('sets startedAt to current time', () => {
      const before = Date.now();
      start(25);
      const after = Date.now();
      const state = readState();
      expect(state.startedAt).toBeGreaterThanOrEqual(before);
      expect(state.startedAt).toBeLessThanOrEqual(after);
    });

    it('stores preset name', () => {
      start(52, 'desktime');
      const state = readState();
      expect(state.preset).toBe('desktime');
    });
  });

  describe('getStatus()', () => {
    it('returns running=false when no timer active', () => {
      const status = getStatus();
      expect(status.running).toBe(false);
      expect(status.complete).toBe(false);
      expect(status.remainingMs).toBe(0);
    });

    it('returns remaining time correctly', () => {
      const fakeNow = 1000000;
      start(25, 'custom');
      const state = readState();
      state.startedAt = fakeNow;
      writeState(state);

      const elapsed = 5 * 60 * 1000;
      const status = getStatus(fakeNow + elapsed);
      expect(status.running).toBe(true);
      expect(status.complete).toBe(false);
      expect(status.elapsed).toBe(elapsed);
      expect(status.remainingMs).toBe(20 * 60 * 1000);
    });

    it('is sleep-safe — uses Date-based comparison not tick-based', () => {
      const fakeStart = 1000000;
      start(25, 'custom');
      const state = readState();
      state.startedAt = fakeStart;
      writeState(state);

      // "Wake up" after 30 minutes — timer should be complete
      const afterSleep = fakeStart + 30 * 60 * 1000;
      const status = getStatus(afterSleep);
      expect(status.complete).toBe(true);
      expect(status.remainingMs).toBe(0);
    });
  });

  describe('isComplete()', () => {
    it('returns false when no timer running', () => {
      expect(isComplete()).toBe(false);
    });

    it('returns false before duration elapsed', () => {
      const fakeNow = 1000000;
      start(25, 'custom');
      const state = readState();
      state.startedAt = fakeNow;
      writeState(state);

      expect(isComplete(fakeNow + 10 * 60 * 1000)).toBe(false);
    });

    it('returns true after duration elapsed (mock Date.now)', () => {
      const fakeNow = 1000000;
      start(25, 'custom');
      const state = readState();
      state.startedAt = fakeNow;
      writeState(state);

      // 26 minutes have passed
      expect(isComplete(fakeNow + 26 * 60 * 1000)).toBe(true);
    });
  });

  describe('stop()', () => {
    it('clears running state', () => {
      start(25, 'custom');
      expect(readState().running).toBe(true);
      stop();
      const state = readState();
      expect(state.running).toBe(false);
      expect(state.startedAt).toBeNull();
    });
  });

  describe('PRESETS', () => {
    it('has correct pomodoro preset', () => {
      expect(PRESETS.pomodoro).toEqual({ focus: 25, break: 5 });
    });

    it('has correct desktime preset', () => {
      expect(PRESETS.desktime).toEqual({ focus: 52, break: 17 });
    });

    it('has correct ultradian preset', () => {
      expect(PRESETS.ultradian).toEqual({ focus: 90, break: 20 });
    });
  });
});
