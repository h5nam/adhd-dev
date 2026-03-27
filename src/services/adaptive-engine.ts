import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { join } from 'node:path';
import { ADHD_DEV_HOME } from '../core/paths.js';
import { logger } from '../core/logger.js';

const BASELINE_FILE = join(ADHD_DEV_HOME, 'baseline.json');
const BASELINE_DAYS = 7;

export type ContextDetailLevel = 'brief' | 'normal' | 'detailed';

export interface AdaptiveParams {
  signalFrequencyMultiplier: number; // 0.5 – 1.5
  signalIntensityLevel: 1 | 2 | 3;  // 1: icon only, 2: icon+badge, 3: icon+badge+sound
  quietModeThreshold: number;        // consecutive ignores before quiet
  contextDetailLevel: ContextDetailLevel;
  supportiveSilenceMode: boolean;
  hyperfocusAlert: boolean;
}

const CONSERVATIVE_DEFAULTS: AdaptiveParams = {
  signalFrequencyMultiplier: 1.0,
  signalIntensityLevel: 2,
  quietModeThreshold: 3,
  contextDetailLevel: 'normal',
  supportiveSilenceMode: false,
  hyperfocusAlert: false,
};

export interface BaselineData {
  startedAt: number;          // unix ms when baseline collection began
  lastRecalcAt: number;       // unix ms of last recalc
  days: DaySignals[];
}

export interface DaySignals {
  date: string;               // YYYY-MM-DD
  productiveAppTimeRatio: number;     // 0–1
  sessionSwitchFrequency: number;     // switches per hour
  timerCompletionRate: number;        // 0–1
  popoverFrequency: number;           // popovers per hour
  signalIgnoreRate: number;           // 0–1
  consecutiveSessions: number;
  maxSessionLengthMin: number;
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function readBaseline(): BaselineData | null {
  if (!existsSync(BASELINE_FILE)) return null;
  try {
    const raw = readFileSync(BASELINE_FILE, 'utf-8');
    return JSON.parse(raw) as BaselineData;
  } catch {
    return null;
  }
}

function writeBaseline(data: BaselineData): void {
  ensureDir(BASELINE_FILE);
  writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function isBaselinePeriod(baseline: BaselineData): boolean {
  const ageMs = Date.now() - baseline.startedAt;
  return ageMs < BASELINE_DAYS * 24 * 60 * 60 * 1000;
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function applyRules(days: DaySignals[]): AdaptiveParams {
  const params: AdaptiveParams = { ...CONSERVATIVE_DEFAULTS };

  const avgIgnoreRate = average(days.map((d) => d.signalIgnoreRate));
  const avgProductiveRatio = average(days.map((d) => d.productiveAppTimeRatio));
  const avgTimerCompletion = average(days.map((d) => d.timerCompletionRate));
  const maxConsecutive = Math.max(...days.map((d) => d.consecutiveSessions), 0);
  const maxSessionLen = Math.max(...days.map((d) => d.maxSessionLengthMin), 0);

  // IF signal_ignore_rate > 60% THEN frequency_multiplier = 0.5
  if (avgIgnoreRate > 0.6) {
    params.signalFrequencyMultiplier = 0.5;
    logger.debug('adaptive-engine: high ignore rate → reduced frequency');
  }

  // IF productive_ratio < 30% AND time > 60min THEN supportive_silence_mode
  if (avgProductiveRatio < 0.3) {
    params.supportiveSilenceMode = true;
    params.signalIntensityLevel = 1;
    logger.debug('adaptive-engine: low productive ratio → supportive silence mode');
  }

  // IF timer_completion_rate > 80% THEN intensity = 1 (already self-regulating)
  if (avgTimerCompletion > 0.8) {
    params.signalIntensityLevel = 1;
    logger.debug('adaptive-engine: high timer completion → icon-only signals');
  }

  // IF consecutive_sessions >= 3 AND length > 30min THEN hyperfocus_alert
  if (maxConsecutive >= 3 && maxSessionLen > 30) {
    params.hyperfocusAlert = true;
    logger.debug('adaptive-engine: long consecutive sessions → hyperfocus alert');
  }

  // Increase detail when user seems engaged
  if (avgTimerCompletion > 0.6 && avgIgnoreRate < 0.3) {
    params.contextDetailLevel = 'detailed';
  } else if (avgIgnoreRate > 0.4) {
    params.contextDetailLevel = 'brief';
  }

  return params;
}

let cachedParams: AdaptiveParams = { ...CONSERVATIVE_DEFAULTS };
let lastRecalcDate = '';

export function getAdaptiveParams(): AdaptiveParams {
  const today = todayDateString();

  // Recalculate at most once per day
  if (today === lastRecalcDate) {
    return cachedParams;
  }

  const baseline = readBaseline();

  if (!baseline) {
    // First run — create baseline file
    const newBaseline: BaselineData = {
      startedAt: Date.now(),
      lastRecalcAt: Date.now(),
      days: [],
    };
    writeBaseline(newBaseline);
    cachedParams = { ...CONSERVATIVE_DEFAULTS };
    lastRecalcDate = today;
    return cachedParams;
  }

  if (isBaselinePeriod(baseline)) {
    // Still in 7-day baseline period — use conservative defaults
    cachedParams = { ...CONSERVATIVE_DEFAULTS };
    lastRecalcDate = today;
    return cachedParams;
  }

  // Use last 7 days of data
  const recentDays = baseline.days.slice(-BASELINE_DAYS);
  if (recentDays.length === 0) {
    cachedParams = { ...CONSERVATIVE_DEFAULTS };
    lastRecalcDate = today;
    return cachedParams;
  }

  cachedParams = applyRules(recentDays);
  lastRecalcDate = today;

  // Update lastRecalcAt
  const updated: BaselineData = {
    ...baseline,
    lastRecalcAt: Date.now(),
  };
  writeBaseline(updated);

  logger.info('adaptive-engine: recalculated params', cachedParams);
  return cachedParams;
}

export function recordDaySignals(signals: DaySignals): void {
  let baseline = readBaseline();
  if (!baseline) {
    baseline = { startedAt: Date.now(), lastRecalcAt: Date.now(), days: [] };
  }

  // Replace or append today's entry
  const idx = baseline.days.findIndex((d) => d.date === signals.date);
  if (idx >= 0) {
    baseline.days[idx] = signals;
  } else {
    baseline.days.push(signals);
  }

  // Keep only the last 90 days
  if (baseline.days.length > 90) {
    baseline.days = baseline.days.slice(-90);
  }

  writeBaseline(baseline);
}
