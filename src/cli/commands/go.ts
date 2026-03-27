import { Command } from 'commander';
import { discoverSessions } from '../../services/claude-session-discovery.js';

export const goCommand = new Command('go')
  .description('Navigate to a session\'s project directory')
  .argument('<session>', 'Session name or project name')
  .action(async (session: string) => {
    // When invoked via shell wrapper: adhd() { eval "$(command adhd-dev "$@")"; }
    // This outputs eval-able commands for the parent shell to execute.
    const sessions = await discoverSessions();
    const target = sessions.find(
      (s) =>
        s.projectName.toLowerCase() === session.toLowerCase() ||
        s.sessionId === session,
    );

    if (!target) {
      // Output a shell echo so the eval wrapper surfaces the error
      process.stdout.write(`echo "adhd-dev: session '${session}' not found"\n`);
      return;
    }

    // Output a cd command for the parent shell to eval
    process.stdout.write(`cd ${JSON.stringify(target.cwd)}\n`);
  });
