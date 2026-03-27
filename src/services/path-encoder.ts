import { readdirSync, existsSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { CLAUDE_PROJECTS_DIR } from '../core/paths.js';

/**
 * Encode a filesystem path to Claude Code's directory naming convention.
 * Replaces both '/' and '.' with '-'.
 * Example: '/Users/hona.mind/Dev/playground/adhd-dev' => '-Users-hona-mind-Dev-playground-adhd-dev'
 */
export function encodePath(fsPath: string): string {
  return fsPath.replace(/[/.]/g, '-');
}

/**
 * Find the Claude projects directory that matches a given filesystem path.
 * First tries exact encoding match, then falls back to fuzzy matching by
 * last 2-3 path segments.
 * Returns the full path to the matching directory, or null if not found.
 */
export function findProjectDir(fsPath: string): string | null {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    return null;
  }

  const encoded = encodePath(fsPath);
  const exact = `${CLAUDE_PROJECTS_DIR}/${encoded}`;
  if (existsSync(exact)) {
    return exact;
  }

  // Fuzzy fallback: scan and match by last 2-3 segments
  let entries: string[];
  try {
    entries = readdirSync(CLAUDE_PROJECTS_DIR);
  } catch {
    return null;
  }

  const segments = fsPath.split('/').filter(Boolean);
  // Try matching last 3 segments, then last 2
  for (const segCount of [3, 2]) {
    if (segments.length < segCount) continue;
    const suffix = segments.slice(-segCount).join('-');
    const suffixEncoded = suffix.replace(/\./g, '-');
    const match = entries.find((e) => e.endsWith(`-${suffixEncoded}`) || e.endsWith(suffixEncoded));
    if (match) {
      return `${CLAUDE_PROJECTS_DIR}/${match}`;
    }
  }

  return null;
}
