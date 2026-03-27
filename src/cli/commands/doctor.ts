import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import {
  ADHD_DEV_HOME,
  ADHD_DEV_CONFIG,
  ADHD_DEV_LOG_DIR,
  ADHD_DEV_PID_FILE,
  ADHD_DEV_TIMER_STATE,
  CLAUDE_HOME,
  CLAUDE_SESSIONS_DIR,
  CLAUDE_PROJECTS_DIR,
} from '../../core/paths.js';
import { encodePath, findProjectDir } from '../../services/path-encoder.js';
import { areHooksInstalled } from '../../services/hook-installer.js';
import { isPromptInstalled, detectShell } from '../../services/shell-integrator.js';

function isDaemonAlive(pidFile: string): boolean {
  if (!existsSync(pidFile)) return false;
  try {
    const pid = parseInt(readFileSync(pidFile, 'utf-8').trim(), 10);
    if (isNaN(pid)) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose ADHD-Dev installation and components')
  .action(async () => {
    const checks = [
      { name: 'ADHD-Dev home', path: ADHD_DEV_HOME },
      { name: 'Config file', path: ADHD_DEV_CONFIG },
      { name: 'Log directory', path: ADHD_DEV_LOG_DIR },
      { name: 'Claude home', path: CLAUDE_HOME },
      { name: 'Claude sessions', path: CLAUDE_SESSIONS_DIR },
      { name: 'Claude projects', path: CLAUDE_PROJECTS_DIR },
    ];

    console.log(chalk.bold('ADHD-Dev Doctor\n'));

    for (const check of checks) {
      const exists = existsSync(check.path);
      const icon = exists ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${icon} ${check.name}: ${chalk.dim(check.path)}`);
    }

    // Daemon status
    console.log('');
    console.log(chalk.bold('Daemon'));
    const daemonAlive = isDaemonAlive(ADHD_DEV_PID_FILE);
    const pidExists = existsSync(ADHD_DEV_PID_FILE);
    if (daemonAlive) {
      console.log(`  ${chalk.green('✓')} Daemon running`);
    } else if (pidExists) {
      console.log(`  ${chalk.yellow('!')} PID file exists but process not alive (stale PID)`);
    } else {
      console.log(`  ${chalk.red('✗')} Daemon not running`);
    }

    // Hooks status
    console.log('');
    console.log(chalk.bold('Hooks'));
    const hooksInstalled = areHooksInstalled();
    console.log(
      `  ${hooksInstalled ? chalk.green('✓') : chalk.red('✗')} Claude Code hooks ${hooksInstalled ? 'installed' : 'not installed'}`,
    );

    // Shell integration
    console.log('');
    console.log(chalk.bold('Shell Integration'));
    const shell = detectShell();
    const promptInstalled = isPromptInstalled(shell);
    console.log(`  ${chalk.dim('Shell:')} ${shell}`);
    console.log(
      `  ${promptInstalled ? chalk.green('✓') : chalk.yellow('!')} Prompt integration ${promptInstalled ? 'installed' : 'not installed'}`,
    );

    // Timer status
    console.log('');
    console.log(chalk.bold('Timer'));
    if (existsSync(ADHD_DEV_TIMER_STATE)) {
      try {
        const raw = readFileSync(ADHD_DEV_TIMER_STATE, 'utf-8');
        const state = JSON.parse(raw) as { running?: boolean; preset?: string };
        if (state.running) {
          console.log(`  ${chalk.green('✓')} Timer running (preset: ${state.preset ?? 'custom'})`);
        } else {
          console.log(`  ${chalk.dim('○')} Timer idle`);
        }
      } catch {
        console.log(`  ${chalk.yellow('!')} Timer state file unreadable`);
      }
    } else {
      console.log(`  ${chalk.dim('○')} No timer state`);
    }

    // Path encoding verification
    console.log('');
    console.log(chalk.bold('Path Encoding'));
    const currentCwd = cwd();
    const encoded = encodePath(currentCwd);
    console.log(`  ${chalk.dim('CWD:')}     ${currentCwd}`);
    console.log(`  ${chalk.dim('Encoded:')} ${encoded}`);

    const projectDir = findProjectDir(currentCwd);
    if (projectDir) {
      console.log(`  ${chalk.green('✓')} Matching Claude project directory found: ${chalk.dim(projectDir)}`);
    } else {
      console.log(`  ${chalk.yellow('!')} No matching Claude project directory found`);
      console.log(`    ${chalk.dim('Expected: ' + CLAUDE_PROJECTS_DIR + '/' + encoded)}`);
    }

    console.log('');
  });
