import { Command } from 'commander';
import { statusCommand } from './commands/status.js';
import { whereCommand } from './commands/where.js';
import { timerCommand } from './commands/timer.js';
import { todayCommand } from './commands/today.js';
import { flowCommand } from './commands/flow.js';
import { dashCommand } from './commands/dash.js';
import { daemonCommand } from './commands/daemon.js';
import { goCommand } from './commands/go.js';
import { doctorCommand } from './commands/doctor.js';
import { configCommand } from './commands/config.js';
import { initCommand } from './commands/init.js';
import { resetCommand } from './commands/reset.js';
import { installHooksCommand } from './commands/install-hooks.js';
import { uninstallHooksCommand } from './commands/uninstall-hooks.js';
import { promptStatusCommand } from './commands/prompt-status.js';
import { tmuxStatusCommand } from './commands/tmux-status.js';

const program = new Command();

program
  .name('adhd-dev')
  .description('CLI focus tool for ADHD developers — your external working memory')
  .version('0.1.0');

program.addCommand(statusCommand);
program.addCommand(whereCommand);
program.addCommand(timerCommand);
program.addCommand(todayCommand);
program.addCommand(flowCommand);
program.addCommand(dashCommand);
program.addCommand(daemonCommand);
program.addCommand(goCommand);
program.addCommand(doctorCommand);
program.addCommand(configCommand);
program.addCommand(initCommand);
program.addCommand(resetCommand);
program.addCommand(installHooksCommand);
program.addCommand(uninstallHooksCommand);
program.addCommand(promptStatusCommand);
program.addCommand(tmuxStatusCommand);

program.parse();
