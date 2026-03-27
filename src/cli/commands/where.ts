import { Command } from 'commander';
import chalk from 'chalk';
import { discoverSessions } from '../../services/claude-session-discovery.js';
import { parseLastExchanges } from '../../services/claude-session-parser.js';

function formatAge(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1m ago';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return '1h ago';
  return `${diffHr}h ago`;
}

function stateIcon(state: string): string {
  return state === 'active' ? chalk.green('●') : chalk.dim('○');
}

export const whereCommand = new Command('where')
  .description('Show "where was I?" context for each active session')
  .option('--brief', 'Show brief context only')
  .action(async (opts: { brief?: boolean }) => {
    const sessions = await discoverSessions();
    const relevant = sessions.filter((s) => s.state === 'active' || s.state === 'idle');

    if (relevant.length === 0) {
      console.log(chalk.dim('No active sessions found'));
      return;
    }

    console.log(chalk.bold('Sessions:'));
    for (const session of relevant) {
      const icon = stateIcon(session.state);
      const ageStr = session.lastActivity ? formatAge(session.lastActivity) : formatAge(session.startedAt);
      const header = `  ${icon} ${chalk.cyan(session.projectName)} ${chalk.dim(`(${session.state}, ${ageStr})`)} ${chalk.dim(session.cwd)}`;
      console.log(header);

      if (!opts.brief && session.jsonlPath) {
        const exchanges = parseLastExchanges(session.jsonlPath, 1);
        const last = exchanges[exchanges.length - 1];
        if (last) {
          const preview = last.content.length > 80 ? last.content.slice(0, 77) + '...' : last.content;
          console.log(`    ${chalk.dim('Last:')} ${chalk.italic(`"${preview}"`)}`);
        }
      }
    }
  });
