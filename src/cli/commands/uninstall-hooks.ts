import { Command } from 'commander';
import chalk from 'chalk';
import { uninstallHooks, areHooksInstalled } from '../../services/hook-installer.js';

export const uninstallHooksCommand = new Command('uninstall-hooks')
  .description('Remove Claude Code hooks')
  .action(async () => {
    if (!areHooksInstalled()) {
      console.log(chalk.dim('No ADHD-Dev hooks found in ~/.claude/settings.json'));
      return;
    }

    process.stdout.write('Removing Claude Code hooks...');
    try {
      uninstallHooks();
      process.stdout.write('\r' + chalk.green('✓') + ' Claude Code hooks removed.\n');
      console.log(chalk.dim('  Backup saved to ~/.claude/settings.json.bak.1'));
    } catch (err) {
      process.stdout.write('\r' + chalk.red('✗') + ' Hook removal failed.\n');
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  });
