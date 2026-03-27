import { getAdaptiveParams } from './adaptive-engine.js';
import { emitSignal, recordActivity, resetSession, writePromptState } from './signal-emitter.js';
import { getStatus as getTimerStatus } from './timer-engine.js';
import { logger } from '../core/logger.js';
import type { DiscoveredSession } from '../models/types.js';

// ETHICAL BOUNDARIES — hardcoded, not configurable:
// - No streak counting
// - No loss framing ("you lost X")
// - No comparison with past performance (automatic)
// - No "wasted X min" expressions
// - No decline highlighting
// - No absence as punishment

export type SessionEvent =
  | { type: 'session-start'; session: DiscoveredSession }
  | { type: 'session-stop'; session: DiscoveredSession; durationMs: number }
  | { type: 'session-activity'; session: DiscoveredSession; productiveMs: number }
  | { type: 'sessions-updated'; sessions: DiscoveredSession[] };

export type TimerEvent =
  | { type: 'timer-tick'; remainingMs: number }
  | { type: 'timer-complete'; preset: string; durationMs: number };

let mostRecentIdleProject = '';

export function handleSessionEvent(event: SessionEvent): void {
  const params = getAdaptiveParams();

  switch (event.type) {
    case 'session-start': {
      logger.info('dopamine-service: session started', { project: event.session.projectName });
      resetSession();
      writePromptState({
        pulse: '',
        returnTo: '',
        warmth: 'warm',
      });
      break;
    }

    case 'session-stop': {
      logger.info('dopamine-service: session stopped', {
        project: event.session.projectName,
        durationMs: event.durationMs,
      });
      mostRecentIdleProject = event.session.projectName;
      // Idle signal — show return context
      emitSignal({
        type: 'idle',
        returnToProject: mostRecentIdleProject,
        force: true,
      });
      break;
    }

    case 'session-activity': {
      recordActivity(event.productiveMs);
      // Emit pulse on exchange completion if intensity allows
      if (params.signalIntensityLevel >= 2) {
        emitSignal({
          type: 'pulse',
          returnToProject: event.session.projectName,
        });
      }
      break;
    }

    case 'sessions-updated': {
      const activeSessions = event.sessions.filter((s) => s.state === 'active');
      const idleSessions = event.sessions.filter((s) => s.state === 'idle');

      if (activeSessions.length === 0 && idleSessions.length > 0) {
        // All sessions idle — show most recently active project
        const mostRecent = idleSessions.sort(
          (a, b) =>
            (b.lastActivity?.getTime() ?? 0) - (a.lastActivity?.getTime() ?? 0),
        )[0];
        if (mostRecent) {
          mostRecentIdleProject = mostRecent.projectName;
          emitSignal({
            type: 'idle',
            returnToProject: mostRecentIdleProject,
            lastActivityAt: mostRecent.lastActivity?.getTime(),
          });
        }
      }
      break;
    }
  }
}

export function handleTimerEvent(event: TimerEvent): void {
  switch (event.type) {
    case 'timer-tick': {
      emitSignal({
        type: 'timer',
        timerRemainingMs: event.remainingMs,
      });
      break;
    }

    case 'timer-complete': {
      logger.info('dopamine-service: timer complete', { preset: event.preset });
      // Pulse on timer completion — always emit (user initiated a timer)
      emitSignal({
        type: 'pulse',
        force: true,
      });
      // Clear timer display
      writePromptState({ timer: '' });
      break;
    }
  }
}

export function tick(): void {
  const timerStatus = getTimerStatus();

  if (timerStatus.running) {
    if (timerStatus.complete) {
      handleTimerEvent({ type: 'timer-complete', preset: timerStatus.preset, durationMs: timerStatus.elapsed });
    } else {
      handleTimerEvent({ type: 'timer-tick', remainingMs: timerStatus.remainingMs });
    }
  }
}
