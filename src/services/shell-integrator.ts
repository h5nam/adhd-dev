import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const HOME = homedir();
const MARKER = '# adhd-dev';

export type Shell = 'zsh' | 'bash' | 'unknown';

export function detectShell(): Shell {
  const shell = process.env['SHELL'] ?? '';
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  return 'unknown';
}

function getRcFile(shell: Shell): string | null {
  if (shell === 'zsh') return join(HOME, '.zshrc');
  if (shell === 'bash') return join(HOME, '.bashrc');
  return null;
}

function appendToRc(rcFile: string, lines: string[]): void {
  const content = existsSync(rcFile) ? readFileSync(rcFile, 'utf-8') : '';
  const newContent = content.endsWith('\n') || content.length === 0
    ? content + lines.join('\n') + '\n'
    : content + '\n' + lines.join('\n') + '\n';
  writeFileSync(rcFile, newContent, 'utf-8');
}

export function installPromptIntegration(shell?: Shell): void {
  const s = shell ?? detectShell();
  const rcFile = getRcFile(s);
  if (!rcFile) return;

  if (isPromptInstalled(s)) return;

  if (s === 'zsh') {
    appendToRc(rcFile, [
      `RPROMPT='$(adhd-dev prompt-status 2>/dev/null)' ${MARKER} prompt integration`,
    ]);
  } else if (s === 'bash') {
    appendToRc(rcFile, [
      `PS1='$(adhd-dev prompt-status 2>/dev/null) '$PS1 ${MARKER} prompt integration`,
    ]);
  }
}

export function installShellWrapper(shell?: Shell): void {
  const s = shell ?? detectShell();
  const rcFile = getRcFile(s);
  if (!rcFile) return;

  const content = existsSync(rcFile) ? readFileSync(rcFile, 'utf-8') : '';
  if (content.includes('adhd-dev shell wrapper')) return;

  appendToRc(rcFile, [
    `adhd() { eval "$(command adhd-dev "$@")"; } ${MARKER} shell wrapper`,
  ]);
}

export function uninstallShellIntegration(shell?: Shell): void {
  const s = shell ?? detectShell();
  const rcFile = getRcFile(s);
  if (!rcFile || !existsSync(rcFile)) return;

  const content = readFileSync(rcFile, 'utf-8');
  const filtered = content
    .split('\n')
    .filter((line) => !line.includes(MARKER))
    .join('\n');

  writeFileSync(rcFile, filtered, 'utf-8');
}

export function isPromptInstalled(shell?: Shell): boolean {
  const s = shell ?? detectShell();
  const rcFile = getRcFile(s);
  if (!rcFile || !existsSync(rcFile)) return false;

  const content = readFileSync(rcFile, 'utf-8');
  return content.includes(`${MARKER} prompt integration`);
}
