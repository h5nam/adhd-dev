import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  calculateLevel,
  countTokensFromJsonl,
  extractRecentTools,
  LEVEL_THRESHOLDS,
} from '../../src/services/agent-tracker.js';

const TEST_DIR = join(tmpdir(), 'adhd-dev-agent-tracker-test-' + process.pid);
const FIXTURE_JSONL = join(
  import.meta.dirname ?? new URL('.', import.meta.url).pathname,
  '../fixtures/mock-claude-home/projects/-tmp-test-project/test-uuid-1.jsonl'
);

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('LEVEL_THRESHOLDS', () => {
  it('has 5 thresholds', () => {
    expect(LEVEL_THRESHOLDS).toHaveLength(5);
  });
});

describe('calculateLevel', () => {
  it('returns level 1 for 0 tokens', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns level 1 for 999 tokens', () => {
    expect(calculateLevel(999)).toBe(1);
  });

  it('returns level 2 for 1000 tokens', () => {
    expect(calculateLevel(1000)).toBe(2);
  });

  it('returns level 2 for 9999 tokens', () => {
    expect(calculateLevel(9999)).toBe(2);
  });

  it('returns level 3 for 10000 tokens', () => {
    expect(calculateLevel(10000)).toBe(3);
  });

  it('returns level 4 for 50000 tokens', () => {
    expect(calculateLevel(50000)).toBe(4);
  });

  it('returns level 5 for 200000 tokens', () => {
    expect(calculateLevel(200000)).toBe(5);
  });

  it('returns level 5 for tokens above 200000', () => {
    expect(calculateLevel(999999)).toBe(5);
  });
});

describe('countTokensFromJsonl', () => {
  it('returns correct total from fixture file', () => {
    // fixture has: input_tokens:100 + output_tokens:50 + input_tokens:200 + output_tokens:150 = 500
    const total = countTokensFromJsonl(FIXTURE_JSONL);
    expect(total).toBe(500);
  });

  it('returns 0 for empty file', () => {
    const filePath = join(TEST_DIR, 'empty.jsonl');
    writeFileSync(filePath, '');
    expect(countTokensFromJsonl(filePath)).toBe(0);
  });

  it('returns 0 for non-existent file', () => {
    expect(countTokensFromJsonl(join(TEST_DIR, 'nonexistent.jsonl'))).toBe(0);
  });

  it('handles corrupted lines without crashing', () => {
    const filePath = join(TEST_DIR, 'corrupted.jsonl');
    writeFileSync(
      filePath,
      [
        JSON.stringify({ type: 'assistant', usage: { input_tokens: 50, output_tokens: 25 } }),
        '{bad json :::',
        '{"incomplete":',
        JSON.stringify({ type: 'assistant', usage: { input_tokens: 10, output_tokens: 5 } }),
      ].join('\n')
    );
    expect(countTokensFromJsonl(filePath)).toBe(90);
  });

  it('sums tokens from multiple assistant messages', () => {
    const filePath = join(TEST_DIR, 'multi.jsonl');
    writeFileSync(
      filePath,
      [
        JSON.stringify({ type: 'human', content: 'hello' }),
        JSON.stringify({ type: 'assistant', content: 'hi', usage: { input_tokens: 100, output_tokens: 50 } }),
        JSON.stringify({ type: 'human', content: 'write code' }),
        JSON.stringify({ type: 'assistant', content: 'done', usage: { input_tokens: 200, output_tokens: 150 } }),
      ].join('\n')
    );
    expect(countTokensFromJsonl(filePath)).toBe(500);
  });
});

describe('extractRecentTools', () => {
  it('returns tool names from fixture file', () => {
    const tools = extractRecentTools(FIXTURE_JSONL);
    expect(tools).toContain('Write');
  });

  it('returns empty array for non-existent file', () => {
    expect(extractRecentTools(join(TEST_DIR, 'nonexistent.jsonl'))).toEqual([]);
  });

  it('returns empty array when no tool_use in file', () => {
    const filePath = join(TEST_DIR, 'no-tools.jsonl');
    writeFileSync(
      filePath,
      [
        JSON.stringify({ type: 'human', content: 'hello' }),
        JSON.stringify({ type: 'assistant', content: 'hi', usage: { input_tokens: 10, output_tokens: 5 } }),
      ].join('\n')
    );
    expect(extractRecentTools(filePath)).toEqual([]);
  });

  it('respects limit parameter', () => {
    const filePath = join(TEST_DIR, 'many-tools.jsonl');
    writeFileSync(
      filePath,
      [
        JSON.stringify({ type: 'assistant', tool_use: [{ name: 'Read' }, { name: 'Write' }, { name: 'Bash' }] }),
        JSON.stringify({ type: 'assistant', tool_use: [{ name: 'Glob' }, { name: 'Grep' }, { name: 'Edit' }] }),
      ].join('\n')
    );
    const tools = extractRecentTools(filePath, 3);
    expect(tools).toHaveLength(3);
  });
});
