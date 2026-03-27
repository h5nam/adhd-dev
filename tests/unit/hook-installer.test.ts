import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), 'adhd-dev-hook-test-' + process.pid);
const TEST_CLAUDE_DIR = join(TEST_DIR, '.claude');
const TEST_SETTINGS = join(TEST_CLAUDE_DIR, 'settings.json');
const TEST_HOOKS_DIR = join(TEST_DIR, 'hooks');

vi.mock('../../src/core/paths.js', async () => {
  const { join: j } = await import('node:path');
  const { tmpdir: t } = await import('node:os');
  const base = j(t(), 'adhd-dev-hook-test-' + process.pid);
  return {
    ADHD_DEV_HOME: base,
    ADHD_DEV_CONFIG: j(base, 'config.json'),
    ADHD_DEV_DB: j(base, 'data.db'),
    ADHD_DEV_LOG_DIR: j(base, 'logs'),
    ADHD_DEV_LOG_FILE: j(base, 'logs', 'adhd-dev.log'),
    ADHD_DEV_PID_FILE: j(base, 'adhd-dev.pid'),
    ADHD_DEV_SOCKET: j(base, 'adhd-dev.sock'),
    ADHD_DEV_TIMER_STATE: j(base, 'timer-state.json'),
    ADHD_DEV_PROMPT_STATE: j(base, 'prompt-state.json'),
    ADHD_DEV_EVENTS_LOG: j(base, 'events.jsonl'),
    ADHD_DEV_HOOKS_DIR: j(base, 'hooks'),
    ADHD_DEV_PATH_CACHE: j(base, 'path-encoding-cache.json'),
    CLAUDE_HOME: j(base, '.claude'),
    CLAUDE_SESSIONS_DIR: j(base, '.claude', 'sessions'),
    CLAUDE_PROJECTS_DIR: j(base, '.claude', 'projects'),
    CLAUDE_SETTINGS: j(base, '.claude', 'settings.json'),
  };
});

import {
  installHooks,
  uninstallHooks,
  areHooksInstalled,
  safeUpdateSettings,
} from '../../src/services/hook-installer.js';

beforeEach(() => {
  mkdirSync(TEST_CLAUDE_DIR, { recursive: true });
  mkdirSync(TEST_HOOKS_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('hook-installer', () => {
  describe('installHooks()', () => {
    it('adds SessionStart, Stop, and Notification hook entries to settings.json', () => {
      installHooks();
      expect(existsSync(TEST_SETTINGS)).toBe(true);
      const raw = readFileSync(TEST_SETTINGS, 'utf-8');
      const settings = JSON.parse(raw);
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks['SessionStart']).toBeDefined();
      expect(settings.hooks['Stop']).toBeDefined();
      expect(settings.hooks['Notification']).toBeDefined();
    });

    it('hook entries contain adhd-dev in command path', () => {
      installHooks();
      const settings = JSON.parse(readFileSync(TEST_SETTINGS, 'utf-8'));
      const sessionStartEntries: Array<{ hooks: Array<{ command: string }> }> = settings.hooks['SessionStart'];
      const hasAdhdDev = sessionStartEntries.some((e) =>
        e.hooks.some((h) => h.command.includes('adhd-dev')),
      );
      expect(hasAdhdDev).toBe(true);
    });

    it('each hook entry has correct shape (matcher + hooks array)', () => {
      installHooks();
      const settings = JSON.parse(readFileSync(TEST_SETTINGS, 'utf-8'));
      const entry = settings.hooks['SessionStart'][0];
      expect(entry).toHaveProperty('matcher');
      expect(entry).toHaveProperty('hooks');
      expect(Array.isArray(entry.hooks)).toBe(true);
      expect(entry.hooks[0]).toHaveProperty('type', 'command');
      expect(entry.hooks[0]).toHaveProperty('command');
    });

    it('does not duplicate entries when called twice', () => {
      installHooks();
      installHooks();
      const settings = JSON.parse(readFileSync(TEST_SETTINGS, 'utf-8'));
      const entries = settings.hooks['SessionStart'];
      const adhdEntries = entries.filter((e: { hooks: Array<{ command: string }> }) =>
        e.hooks.some((h) => h.command.includes('adhd-dev')),
      );
      expect(adhdEntries.length).toBe(1);
    });

    it('preserves existing non-adhd-dev hooks', () => {
      const existing = {
        hooks: {
          SessionStart: [
            { matcher: '', hooks: [{ type: 'command', command: '/usr/local/bin/other-tool' }] },
          ],
        },
      };
      writeFileSync(TEST_SETTINGS, JSON.stringify(existing, null, 2));
      installHooks();
      const settings = JSON.parse(readFileSync(TEST_SETTINGS, 'utf-8'));
      const entries = settings.hooks['SessionStart'];
      const hasOther = entries.some((e: { hooks: Array<{ command: string }> }) =>
        e.hooks.some((h) => h.command.includes('other-tool')),
      );
      expect(hasOther).toBe(true);
    });

    it('handles missing settings.json gracefully', () => {
      // settings.json does not exist
      expect(() => installHooks()).not.toThrow();
      expect(existsSync(TEST_SETTINGS)).toBe(true);
    });

    it('handles empty settings.json gracefully', () => {
      writeFileSync(TEST_SETTINGS, '');
      expect(() => installHooks()).not.toThrow();
    });

    it('writes valid JSON', () => {
      installHooks();
      const raw = readFileSync(TEST_SETTINGS, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('creates backup file', () => {
      writeFileSync(TEST_SETTINGS, JSON.stringify({ hooks: {} }, null, 2));
      installHooks();
      expect(existsSync(`${TEST_SETTINGS}.bak.1`)).toBe(true);
    });

    it('rotates backups up to 3 versions', () => {
      // Create three successive installs to build up backup chain
      writeFileSync(TEST_SETTINGS, JSON.stringify({ version: 1 }, null, 2));
      installHooks();
      // Reinstall to rotate
      writeFileSync(TEST_SETTINGS, JSON.stringify({ version: 2 }, null, 2));
      installHooks();
      writeFileSync(TEST_SETTINGS, JSON.stringify({ version: 3 }, null, 2));
      installHooks();
      expect(existsSync(`${TEST_SETTINGS}.bak.1`)).toBe(true);
      expect(existsSync(`${TEST_SETTINGS}.bak.2`)).toBe(true);
    });
  });

  describe('uninstallHooks()', () => {
    it('removes adhd-dev hook entries from settings.json', () => {
      installHooks();
      expect(areHooksInstalled()).toBe(true);
      uninstallHooks();
      expect(areHooksInstalled()).toBe(false);
    });

    it('preserves non-adhd-dev hooks after uninstall', () => {
      const existing = {
        hooks: {
          SessionStart: [
            { matcher: '', hooks: [{ type: 'command', command: '/usr/local/bin/other-tool' }] },
          ],
        },
      };
      writeFileSync(TEST_SETTINGS, JSON.stringify(existing, null, 2));
      installHooks();
      uninstallHooks();
      const settings = JSON.parse(readFileSync(TEST_SETTINGS, 'utf-8'));
      const entries = settings.hooks['SessionStart'] ?? [];
      const hasOther = entries.some((e: { hooks: Array<{ command: string }> }) =>
        e.hooks.some((h) => h.command.includes('other-tool')),
      );
      expect(hasOther).toBe(true);
    });

    it('does not throw when settings.json does not exist', () => {
      expect(() => uninstallHooks()).not.toThrow();
    });

    it('creates a backup before removing', () => {
      installHooks();
      // Remove bak.1 to test that uninstall creates one
      const bak1 = `${TEST_SETTINGS}.bak.1`;
      if (existsSync(bak1)) rmSync(bak1);
      uninstallHooks();
      expect(existsSync(bak1)).toBe(true);
    });
  });

  describe('areHooksInstalled()', () => {
    it('returns false when settings.json does not exist', () => {
      expect(areHooksInstalled()).toBe(false);
    });

    it('returns false when hooks section is missing', () => {
      writeFileSync(TEST_SETTINGS, JSON.stringify({ other: true }, null, 2));
      expect(areHooksInstalled()).toBe(false);
    });

    it('returns true after installHooks()', () => {
      installHooks();
      expect(areHooksInstalled()).toBe(true);
    });

    it('returns false after uninstallHooks()', () => {
      installHooks();
      uninstallHooks();
      expect(areHooksInstalled()).toBe(false);
    });
  });

  describe('safeUpdateSettings()', () => {
    it('produces valid JSON after update', () => {
      safeUpdateSettings((s) => ({ ...s, testKey: 'testValue' }));
      const raw = readFileSync(TEST_SETTINGS, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.testKey).toBe('testValue');
    });

    it('atomic write — no tmp file left behind', () => {
      safeUpdateSettings((s) => s);
      expect(existsSync(`${TEST_SETTINGS}.tmp`)).toBe(false);
    });
  });
});
