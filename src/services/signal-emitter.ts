import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ADHD_DEV_PROMPT_STATE } from '../core/paths.js';
import { logger } from '../core/logger.js';
import type { PromptState } from '../models/types.js';

// Fibonacci sequence for badge intervals
const FIBONACCI = [3, 5, 8, 13, 21, 34, 55, 89];

// Signal frequency enforcement
const MIN_PROMINENT_SIGNAL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const QUIET_MODE_IGNORE_THRESHOLD = 3;

interface SignalEmitterState {
  lastProminentSignalAt: number;
  consecutiveIgnores: number;
  quietMode: boolean;
  badgeIndex: number;
  sessionProductiveMs: number;
  sessionStartAt: number;
  lastActivityAt: number;
}

const state: SignalEmitterState = {
  lastProminentSignalAt: 0,
  consecutiveIgnores: 0,
  quietMode: false,
  badgeIndex: 0,
  sessionProductiveMs: 0,
  sessionStartAt: Date.now(),
  lastActivityAt: Date.now(),
};

export function resetSession(): void {
  state.consecutiveIgnores = 0;
  state.quietMode = false;
  state.badgeIndex = 0;
  state.sessionProductiveMs = 0;
  state.sessionStartAt = Date.now();
  state.lastActivityAt = Date.now();
}

export function recordIgnore(): void {
  state.consecutiveIgnores++;
  if (state.consecutiveIgnores >= QUIET_MODE_IGNORE_THRESHOLD) {
    state.quietMode = true;
    logger.info('signal-emitter: quiet mode activated after consecutive ignores');
  }
}

export function recordActivity(productiveMs: number): void {
  state.sessionProductiveMs += productiveMs;
  state.lastActivityAt = Date.now();
  // Reset ignore count on genuine activity
  state.consecutiveIgnores = 0;
  if (state.quietMode) {
    state.quietMode = false;
    logger.info('signal-emitter: quiet mode deactivated on activity');
  }
}

function isBadDayDetected(): boolean {
  const sessionDurationMs = Date.now() - state.sessionStartAt;
  if (sessionDurationMs < 60 * 60 * 1000) return false; // need at least 60 min of data
  return state.sessionProductiveMs < 10 * 60 * 1000; // < 10min productive in 60min
}

function canEmitProminentSignal(): boolean {
  if (state.quietMode) return false;
  if (isBadDayDetected()) return false;
  const now = Date.now();
  return now - state.lastProminentSignalAt >= MIN_PROMINENT_SIGNAL_INTERVAL_MS;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 18) return 'EVE';
  if (hour >= 12) return 'PM';
  return 'AM';
}

function getWarmth(lastActivityMs: number): string {
  const ageMs = Date.now() - lastActivityMs;
  if (ageMs < 5 * 60 * 1000) return 'warm';
  if (ageMs < 30 * 60 * 1000) return 'medium';
  return 'cool';
}

function nextBadge(): number {
  const badge = FIBONACCI[Math.min(state.badgeIndex, FIBONACCI.length - 1)];
  state.badgeIndex = Math.min(state.badgeIndex + 1, FIBONACCI.length - 1);
  return badge;
}

function formatTimerMs(remainingMs: number): string {
  if (remainingMs <= 0) return '00:00';
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readPromptState(): PromptState {
  try {
    if (existsSync(ADHD_DEV_PROMPT_STATE)) {
      const raw = readFileSync(ADHD_DEV_PROMPT_STATE, 'utf-8');
      return JSON.parse(raw) as PromptState;
    }
  } catch {
    // fall through
  }
  return {
    pulse: '',
    badge: 0,
    timer: '',
    timeOfDay: getTimeOfDay(),
    returnTo: '',
    warmth: 'warm',
    updated: Date.now(),
  };
}

export function writePromptState(partial: Partial<PromptState>): void {
  const current = readPromptState();
  const updated: PromptState = {
    ...current,
    ...partial,
    updated: Date.now(),
  };
  ensureDir(ADHD_DEV_PROMPT_STATE);
  writeFileSync(ADHD_DEV_PROMPT_STATE, JSON.stringify(updated, null, 2), 'utf-8');
}

export interface SignalOptions {
  type: 'pulse' | 'badge' | 'timer' | 'idle';
  timerRemainingMs?: number;
  returnToProject?: string;
  lastActivityAt?: number;
  force?: boolean;
}

export function emitSignal(opts: SignalOptions): PromptState | null {
  const { type, timerRemainingMs, returnToProject, lastActivityAt, force = false } = opts;

  const timeOfDay = getTimeOfDay();
  const warmth = getWarmth(lastActivityAt ?? state.lastActivityAt);

  if (type === 'timer') {
    // Timer updates are always written (not prominent signals)
    const timerStr = timerRemainingMs !== undefined ? formatTimerMs(timerRemainingMs) : '';
    writePromptState({ timer: timerStr, timeOfDay, warmth });
    return readPromptState();
  }

  if (type === 'idle') {
    // Idle state: update returnTo and warmth
    writePromptState({
      pulse: '',
      timer: '',
      timeOfDay,
      warmth,
      returnTo: returnToProject ?? '',
    });
    return readPromptState();
  }

  if (!force && !canEmitProminentSignal()) {
    logger.debug(
      `signal-emitter: suppressing ${type} signal (quiet=${state.quietMode}, badDay=${isBadDayDetected()})`,
    );
    return null;
  }

  state.lastProminentSignalAt = Date.now();

  if (type === 'pulse') {
    writePromptState({
      pulse: '*',
      badge: nextBadge(),
      timeOfDay,
      warmth,
      returnTo: returnToProject ?? '',
    });
  } else if (type === 'badge') {
    writePromptState({
      badge: nextBadge(),
      timeOfDay,
      warmth,
    });
  }

  return readPromptState();
}
