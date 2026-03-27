import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../../core/config.js';

export const configCommand = new Command('config')
  .description('View or edit configuration')
  .action(async () => {
    const config = loadConfig();
    console.log(chalk.bold('Current configuration:\n'));
    console.log(JSON.stringify(config, null, 2));
  });
