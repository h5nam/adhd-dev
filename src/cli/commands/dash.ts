import { Command } from 'commander';
import { startDashboard } from '../../tui/dashboard.js';

export const dashCommand = new Command('dash')
  .description('Open TUI dashboard')
  .action(async () => {
    await startDashboard();
  });
