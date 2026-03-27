import { Command } from 'commander';
import chalk from 'chalk';
import { installHooks, areHooksInstalled } from '../../services/hook-installer.js';

export const installHooksCommand = new Command('install-hooks')
  .description('Install Claude Code hooks for session tracking')
  .action(async () => {
    if (areHooksInstalled()) {
      console.log(chalk.yellow('! Hooks already installed. Use `adhd-dev uninstall-hooks` first to reinstall.'));
      return;
    }

    process.stdout.write('Installing Claude Code hooks...');
    try {
      installHooks();
      process.stdout.write('\r' + chalk.green('✓') + ' Claude Code hooks installed successfully.\n');
      console.log(chalk.dim('  Hook scripts copied to ~/.adhd-dev/hooks/'));
      console.log(chalk.dim('  Settings updated at ~/.claude/settings.json'));
    } catch (err) {
      process.stdout.write('\r' + chalk.red('✗') + ' Hook installation failed.\n');
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  });
