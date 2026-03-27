import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../../core/config.js';
import { discoverSessions } from '../../services/claude-session-discovery.js';

export const statusCommand = new Command('status')
  .description('Show current ADHD-Dev status and active sessions')
  .action(async () => {
    loadConfig(); // ensures ~/.adhd-dev/ exists

    const sessions = await discoverSessions();
    const active = sessions.filter((s) => s.state === 'active');
    const idle = sessions.filter((s) => s.state === 'idle');
    const total = sessions.length;

    if (total === 0) {
      console.log(chalk.dim('No Claude sessions found'));
      return;
    }

    console.log(chalk.bold('Session Status'));
    console.log(`  ${chalk.green('Active:')}  ${active.length}`);
    console.log(`  ${chalk.yellow('Idle:')}    ${idle.length}`);
    console.log(`  ${chalk.dim('Total:')}   ${total}`);

    if (active.length > 0) {
      console.log('');
      console.log(chalk.bold('Active sessions:'));
      for (const s of active) {
        console.log(`  ${chalk.green('●')} ${chalk.cyan(s.projectName)} ${chalk.dim(s.cwd)}`);
      }
    }
  });
