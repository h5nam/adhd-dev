import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { ADHD_DEV_HOME, ADHD_DEV_PID_FILE } from '../../core/paths.js';
import { uninstallHooks, areHooksInstalled } from '../../services/hook-installer.js';
import { uninstallShellIntegration, detectShell } from '../../services/shell-integrator.js';

function stopDaemon(): boolean {
  if (!existsSync(ADHD_DEV_PID_FILE)) return false;
  try {
    const pid = parseInt(readFileSync(ADHD_DEV_PID_FILE, 'utf-8').trim(), 10);
    if (isNaN(pid)) return false;
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

export const resetCommand = new Command('reset')
  .description('Delete all ADHD-Dev data and settings')
  .option('--force', 'Skip confirmation')
  .action(async (opts) => {
    if (!opts.force) {
      console.log(chalk.yellow('This will delete all ADHD-Dev data. Use --force to confirm.'));
      return;
    }

    console.log(chalk.bold('Resetting ADHD-Dev...\n'));

    // Step 1: Stop daemon
    process.stdout.write('  Stopping daemon...');
    const stopped = stopDaemon();
    process.stdout.write(
      stopped
        ? `\r  ${chalk.green('✓')} Daemon stopped\n`
        : `\r  ${chalk.dim('○')} Daemon was not running\n`,
    );

    // Step 2: Uninstall hooks
    process.stdout.write('  Removing hooks...');
    try {
      if (areHooksInstalled()) {
        uninstallHooks();
        process.stdout.write(`\r  ${chalk.green('✓')} Hooks removed\n`);
      } else {
        process.stdout.write(`\r  ${chalk.dim('○')} No hooks to remove\n`);
      }
    } catch (err) {
      process.stdout.write(`\r  ${chalk.yellow('!')} Hook removal failed: ${(err as Error).message}\n`);
    }

    // Step 3: Uninstall shell integration
    process.stdout.write('  Removing shell integration...');
    try {
      const shell = detectShell();
      uninstallShellIntegration(shell);
      process.stdout.write(`\r  ${chalk.green('✓')} Shell integration removed\n`);
    } catch (err) {
      process.stdout.write(`\r  ${chalk.yellow('!')} Shell integration removal failed: ${(err as Error).message}\n`);
    }

    // Step 4: Delete ~/.adhd-dev/
    process.stdout.write('  Deleting ~/.adhd-dev/...');
    try {
      if (existsSync(ADHD_DEV_HOME)) {
        rmSync(ADHD_DEV_HOME, { recursive: true, force: true });
        process.stdout.write(`\r  ${chalk.green('✓')} ~/.adhd-dev/ deleted\n`);
      } else {
        process.stdout.write(`\r  ${chalk.dim('○')} ~/.adhd-dev/ not found\n`);
      }
    } catch (err) {
      process.stdout.write(`\r  ${chalk.red('✗')} Failed to delete ~/.adhd-dev/: ${(err as Error).message}\n`);
    }

    console.log('');
    console.log(chalk.green('Reset complete.') + ' All ADHD-Dev data has been removed.');
  });
