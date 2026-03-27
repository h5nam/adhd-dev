import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../../core/config.js';
import { installHooks, areHooksInstalled } from '../../services/hook-installer.js';
import { installPromptIntegration, installShellWrapper, detectShell } from '../../services/shell-integrator.js';
import { ADHD_DEV_HOME, CLAUDE_SESSIONS_DIR } from '../../core/paths.js';
import { existsSync, readdirSync } from 'node:fs';

function countSessions(): number {
  try {
    if (!existsSync(CLAUDE_SESSIONS_DIR)) return 0;
    return readdirSync(CLAUDE_SESSIONS_DIR).filter((f) => f.endsWith('.jsonl')).length;
  } catch {
    return 0;
  }
}

export const initCommand = new Command('init')
  .description('Initial setup wizard')
  .option('--full', 'One-button full setup (hooks + daemon + prompt + tmux)')
  .action(async (opts) => {
    loadConfig(); // ensures directories and config exist

    console.log(chalk.bold('Welcome to ADHD-Dev — your external working memory\n'));

    const sessions = countSessions();
    console.log(`  ${chalk.dim('Claude sessions detected:')} ${sessions}`);
    console.log(`  ${chalk.green('✓')} Config created at ${chalk.dim(ADHD_DEV_HOME)}`);

    if (!opts.full) {
      console.log(chalk.dim('\nRun `adhd-dev init --full` for complete setup with hooks and shell integration.'));
      return;
    }

    console.log('');
    console.log(chalk.bold('Running full setup...\n'));

    // Step 1: Basic config (already done above)
    console.log(`  ${chalk.green('✓')} Basic config`);

    // Step 2: Install hooks
    process.stdout.write(`  ${chalk.dim('○')} Installing Claude Code hooks...`);
    try {
      installHooks();
      process.stdout.write(`\r  ${chalk.green('✓')} Claude Code hooks installed\n`);
    } catch (err) {
      process.stdout.write(`\r  ${chalk.red('✗')} Hook installation failed: ${(err as Error).message}\n`);
    }

    // Step 3: Shell prompt integration
    const shell = detectShell();
    process.stdout.write(`  ${chalk.dim('○')} Installing shell prompt integration (${shell})...`);
    try {
      installPromptIntegration(shell);
      process.stdout.write(`\r  ${chalk.green('✓')} Shell prompt integration installed (${shell})\n`);
    } catch (err) {
      process.stdout.write(`\r  ${chalk.yellow('!')} Shell prompt skipped: ${(err as Error).message}\n`);
    }

    // Step 4: Shell wrapper
    process.stdout.write(`  ${chalk.dim('○')} Installing shell wrapper...`);
    try {
      installShellWrapper(shell);
      process.stdout.write(`\r  ${chalk.green('✓')} Shell wrapper installed\n`);
    } catch (err) {
      process.stdout.write(`\r  ${chalk.yellow('!')} Shell wrapper skipped: ${(err as Error).message}\n`);
    }

    // Step 5: Daemon instructions
    console.log('');
    console.log(chalk.bold('Daemon auto-start:'));
    console.log(`  Run ${chalk.cyan('adhd-dev daemon start')} to start the background daemon.`);
    console.log(`  Add to your shell rc: ${chalk.dim('adhd-dev daemon start --quiet &')}`);

    // Step 6: Doctor check
    console.log('');
    console.log(chalk.bold('Status check:'));
    const hooksOk = areHooksInstalled();
    console.log(`  ${hooksOk ? chalk.green('✓') : chalk.red('✗')} Hooks installed`);
    console.log('');
    console.log(chalk.green('Setup complete!') + ' Restart your shell or run: ' + chalk.cyan(`source ~/.${shell}rc`));
  });
