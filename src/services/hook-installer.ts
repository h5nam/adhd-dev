import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  chmodSync,
  renameSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLAUDE_SETTINGS, ADHD_DEV_HOOKS_DIR } from '../core/paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Hook script names and their corresponding Claude hook event
const HOOK_SCRIPTS: Array<{ file: string; event: string }> = [
  { file: 'session-start.sh', event: 'SessionStart' },
  { file: 'session-stop.sh', event: 'Stop' },
  { file: 'notification.sh', event: 'Notification' },
];

// Marker used to identify our hook entries
const ADHD_MARKER = 'adhd-dev';

interface HookEntry {
  matcher: string;
  hooks: Array<{ type: string; command: string }>;
}

interface ClaudeSettings {
  hooks?: Record<string, HookEntry[]>;
  [key: string]: unknown;
}

function readSettings(): ClaudeSettings {
  if (!existsSync(CLAUDE_SETTINGS)) {
    return {};
  }
  try {
    const raw = readFileSync(CLAUDE_SETTINGS, 'utf-8');
    return JSON.parse(raw) as ClaudeSettings;
  } catch {
    return {};
  }
}

function rotateBackups(): void {
  // Rotate bak.2 -> bak.3, bak.1 -> bak.2
  for (let i = 2; i >= 1; i--) {
    const from = `${CLAUDE_SETTINGS}.bak.${i}`;
    const to = `${CLAUDE_SETTINGS}.bak.${i + 1}`;
    if (existsSync(from)) {
      try {
        copyFileSync(from, to);
      } catch {
        // ignore backup rotation errors
      }
    }
  }
  // current -> bak.1
  if (existsSync(CLAUDE_SETTINGS)) {
    try {
      copyFileSync(CLAUDE_SETTINGS, `${CLAUDE_SETTINGS}.bak.1`);
    } catch {
      // ignore backup errors
    }
  }
}

export function safeUpdateSettings(mutator: (settings: ClaudeSettings) => ClaudeSettings): void {
  const settings = readSettings();
  rotateBackups();
  const updated = mutator(settings);

  const dir = dirname(CLAUDE_SETTINGS);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tmpPath = `${CLAUDE_SETTINGS}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(updated, null, 2), 'utf-8');
  renameSync(tmpPath, CLAUDE_SETTINGS);
}

function copyHookScripts(): void {
  if (!existsSync(ADHD_DEV_HOOKS_DIR)) {
    mkdirSync(ADHD_DEV_HOOKS_DIR, { recursive: true });
  }

  // Hook scripts live in src/hooks/ during development; in dist/hooks/ after build
  const srcDir = join(__dirname, '..', 'hooks');
  const distDir = join(__dirname, 'hooks');

  for (const { file } of HOOK_SCRIPTS) {
    const dest = join(ADHD_DEV_HOOKS_DIR, file);

    // Try src/hooks first (dev), then dist/hooks (built)
    let src = join(srcDir, file);
    if (!existsSync(src)) {
      src = join(distDir, file);
    }

    if (existsSync(src)) {
      copyFileSync(src, dest);
      chmodSync(dest, 0o755);
    } else {
      // Write minimal fallback script if source not found
      writeFileSync(
        dest,
        `#!/bin/bash\n# ADHD-Dev ${file} hook\n`,
        'utf-8',
      );
      chmodSync(dest, 0o755);
    }
  }
}

export function installHooks(): void {
  copyHookScripts();

  safeUpdateSettings((settings) => {
    const hooks: Record<string, HookEntry[]> = settings.hooks ?? {};

    for (const { file, event } of HOOK_SCRIPTS) {
      const scriptPath = join(ADHD_DEV_HOOKS_DIR, file);
      const entries: HookEntry[] = hooks[event] ?? [];

      // Remove any existing adhd-dev entry for this event
      const filtered = entries.filter(
        (e) => !e.hooks.some((h) => h.command.includes(ADHD_MARKER)),
      );

      filtered.push({
        matcher: '',
        hooks: [{ type: 'command', command: scriptPath }],
      });

      hooks[event] = filtered;
    }

    return { ...settings, hooks };
  });
}

export function uninstallHooks(): void {
  if (!existsSync(CLAUDE_SETTINGS)) {
    return;
  }

  safeUpdateSettings((settings) => {
    if (!settings.hooks) return settings;

    const hooks: Record<string, HookEntry[]> = {};

    for (const [event, entries] of Object.entries(settings.hooks)) {
      const filtered = entries.filter(
        (e) => !e.hooks.some((h) => h.command.includes(ADHD_MARKER)),
      );
      if (filtered.length > 0) {
        hooks[event] = filtered;
      }
    }

    return { ...settings, hooks };
  });
}

export function areHooksInstalled(): boolean {
  if (!existsSync(CLAUDE_SETTINGS)) {
    return false;
  }

  const settings = readSettings();
  if (!settings.hooks) return false;

  return HOOK_SCRIPTS.every(({ event }) => {
    const entries: HookEntry[] = settings.hooks?.[event] ?? [];
    return entries.some((e) => e.hooks.some((h) => h.command.includes(ADHD_MARKER)));
  });
}
