import { Command } from 'commander';
import chalk from 'chalk';
import { start, stop, getStatus, PRESETS } from '../../services/timer-engine.js';
import { recordCompletedSession, getTodayStats } from '../../services/stats-aggregator.js';
import { notifyTimerComplete } from '../../services/notification.js';

function formatDuration(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export const timerCommand = new Command('timer')
  .description('Manage focus timer');

timerCommand
  .command('start [minutes]')
  .description('Start a focus session')
  .action(async (minutes?: string) => {
    const status = getStatus();
    if (status.running) {
      console.log(chalk.yellow(`Timer already running (${formatDuration(status.remainingMs)} remaining). Stop it first.`));
      return;
    }
    const mins = minutes ? parseInt(minutes, 10) : 25;
    start(mins, 'custom');
    console.log(chalk.green(`Starting ${mins}-minute focus session...`));
  });

timerCommand
  .command('stop')
  .description('Stop the current focus session')
  .action(async () => {
    const status = getStatus();
    if (!status.running) {
      console.log(chalk.dim('No active timer to stop.'));
      return;
    }
    const elapsedMinutes = Math.floor(status.elapsed / 60000);
    stop();
    if (elapsedMinutes > 0) {
      recordCompletedSession(elapsedMinutes);
      console.log(chalk.yellow(`Timer stopped. Recorded ${elapsedMinutes} minutes.`));
    } else {
      console.log(chalk.yellow('Timer stopped.'));
    }
  });

timerCommand
  .command('status')
  .description('Show timer status')
  .action(async () => {
    const status = getStatus();
    if (!status.running) {
      console.log(chalk.dim('No active timer'));
      return;
    }
    if (status.complete) {
      const stats = getTodayStats();
      const elapsedMinutes = Math.floor(status.elapsed / 60000);
      stop();
      const updated = recordCompletedSession(elapsedMinutes);
      notifyTimerComplete(elapsedMinutes, updated.completedSessions, updated.focusMinutes);
      console.log(chalk.green(`Focus session complete! ${elapsedMinutes} minutes focused.`));
    } else {
      console.log(chalk.cyan(`Focus session active — ${formatDuration(status.remainingMs)} remaining [${status.preset}]`));
    }
  });

timerCommand
  .command('preset <name>')
  .description('Use a timer preset (pomodoro, desktime, ultradian)')
  .action(async (name: string) => {
    const preset = PRESETS[name];
    if (!preset) {
      console.log(chalk.red(`Unknown preset: ${name}. Available: ${Object.keys(PRESETS).join(', ')}`));
      return;
    }
    const status = getStatus();
    if (status.running) {
      console.log(chalk.yellow(`Timer already running (${formatDuration(status.remainingMs)} remaining). Stop it first.`));
      return;
    }
    start(preset.focus, name);
    console.log(chalk.green(`Starting ${name} preset: ${preset.focus}-minute focus session...`));
  });
