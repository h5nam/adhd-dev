import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ADHD_DEV_TIMER_STATE } from '../core/paths.js';
import type { TimerState } from '../models/types.js';

export const PRESETS: Record<string, { focus: number; break: number }> = {
  pomodoro: { focus: 25, break: 5 },
  desktime: { focus: 52, break: 17 },
  ultradian: { focus: 90, break: 20 },
};

const DEFAULT_STATE: TimerState = {
  running: false,
  startedAt: null,
  durationMs: 0,
  preset: 'custom',
  flowMode: false,
  pausedAt: null,
};

export interface TimerStatus {
  running: boolean;
  remainingMs: number;
  elapsed: number;
  preset: string;
  flowMode: boolean;
  complete: boolean;
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readState(): TimerState {
  if (!existsSync(ADHD_DEV_TIMER_STATE)) {
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = readFileSync(ADHD_DEV_TIMER_STATE, 'utf-8');
    return JSON.parse(raw) as TimerState;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeState(state: TimerState): void {
  ensureDir(ADHD_DEV_TIMER_STATE);
  writeFileSync(ADHD_DEV_TIMER_STATE, JSON.stringify(state, null, 2), 'utf-8');
}

export function start(minutes: number, preset = 'custom'): TimerState {
  const state = readState();
  const newState: TimerState = {
    ...state,
    running: true,
    startedAt: Date.now(),
    durationMs: minutes * 60 * 1000,
    preset,
    pausedAt: null,
  };
  writeState(newState);
  return newState;
}

export function stop(): TimerState {
  const state = readState();
  const newState: TimerState = {
    ...state,
    running: false,
    startedAt: null,
    pausedAt: null,
  };
  writeState(newState);
  return newState;
}

export function getStatus(now = Date.now()): TimerStatus {
  const state = readState();

  if (!state.running || state.startedAt === null) {
    return {
      running: false,
      remainingMs: 0,
      elapsed: 0,
      preset: state.preset,
      flowMode: state.flowMode,
      complete: false,
    };
  }

  const elapsed = now - state.startedAt;
  const remainingMs = Math.max(0, state.durationMs - elapsed);
  const complete = elapsed >= state.durationMs;

  return {
    running: state.running,
    remainingMs,
    elapsed,
    preset: state.preset,
    flowMode: state.flowMode,
    complete,
  };
}

export function isComplete(now = Date.now()): boolean {
  const state = readState();
  if (!state.running || state.startedAt === null) return false;
  return now - state.startedAt >= state.durationMs;
}
