import { Command } from 'commander';
import chalk from 'chalk';
import { enableFlow, disableFlow } from '../../services/flow-protection.js';

export const flowCommand = new Command('flow')
  .description('Toggle flow protection mode')
  .argument('<state>', 'on or off')
  .action(async (state: string) => {
    if (state === 'on') {
      enableFlow();
      console.log(chalk.green('Flow protection: ON — timer notifications suppressed'));
    } else if (state === 'off') {
      disableFlow();
      console.log(chalk.yellow('Flow protection: OFF'));
    } else {
      console.log(chalk.red(`Unknown state: ${state}. Use 'on' or 'off'.`));
    }
  });
