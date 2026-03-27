import { Command } from 'commander';
import chalk from 'chalk';
import { getTodayStats } from '../../services/stats-aggregator.js';

export const todayCommand = new Command('today')
  .description("Show today's focus stats")
  .action(async () => {
    const stats = getTodayStats();
    if (stats.completedSessions === 0) {
      console.log(chalk.dim('No focus sessions today yet'));
      return;
    }
    const hours = Math.floor(stats.focusMinutes / 60);
    const mins = stats.focusMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    console.log(
      chalk.cyan(`Today: ${timeStr} focused | ${stats.completedSessions} session${stats.completedSessions !== 1 ? 's' : ''} completed`)
    );
  });
