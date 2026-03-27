import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { ADHD_DEV_PROMPT_STATE } from '../../core/paths.js';

export const tmuxStatusCommand = new Command('tmux-status')
  .description('Output tmux status-right string')
  .action(() => {
    if (!existsSync(ADHD_DEV_PROMPT_STATE)) {
      return;
    }

    try {
      const raw = readFileSync(ADHD_DEV_PROMPT_STATE, 'utf-8');
      const state = JSON.parse(raw);

      const parts: string[] = [];

      if (state.timeOfDay) parts.push(state.timeOfDay);
      if (state.timer) parts.push(`⏱${state.timer}`);
      if (state.pulse) parts.push(`[${state.pulse}${state.badge > 0 ? state.badge : ''}]`);
      if (state.returnTo) parts.push(`→${state.returnTo}`);

      if (parts.length > 0) {
        process.stdout.write(parts.join(' | '));
      }
    } catch {
      // Silent fail
    }
  });
