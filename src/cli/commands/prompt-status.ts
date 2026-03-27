import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { ADHD_DEV_PROMPT_STATE } from '../../core/paths.js';

export const promptStatusCommand = new Command('prompt-status')
  .description('Output prompt status string (for shell integration)')
  .action(() => {
    // Fast path: read prompt-state.json, output ANSI string, exit
    // No daemon IPC needed — file-based for <10ms performance
    if (!existsSync(ADHD_DEV_PROMPT_STATE)) {
      // Graceful degradation: empty output when daemon not running
      return;
    }

    try {
      const raw = readFileSync(ADHD_DEV_PROMPT_STATE, 'utf-8');
      const state = JSON.parse(raw);

      const parts: string[] = [];

      if (state.timer) parts.push(state.timer);
      if (state.pulse) parts.push(`[${state.pulse}${state.badge > 0 ? state.badge : ''}]`);
      if (state.returnTo) parts.push(`[<-${state.returnTo}]`);

      if (parts.length > 0) {
        process.stdout.write(parts.join(' '));
      }
    } catch {
      // Silent fail — prompt integration should never break the shell
    }
  });
