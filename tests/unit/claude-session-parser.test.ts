import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseLastExchanges } from '../../src/services/claude-session-parser.js';

const TEST_DIR = join(tmpdir(), 'adhd-dev-parser-test-' + process.pid);

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('parseLastExchanges', () => {
  it('parses valid jsonl and returns exchanges', () => {
    const filePath = join(TEST_DIR, 'valid.jsonl');
    writeFileSync(
      filePath,
      [
        JSON.stringify({ type: 'human', content: 'Hello there', timestamp: '2025-01-01T10:00:00.000Z' }),
        JSON.stringify({ type: 'assistant', content: 'Hi! How can I help?' }),
        JSON.stringify({ type: 'human', content: 'What is 2+2?' }),
        JSON.stringify({ type: 'assistant', content: 'It is 4.' }),
      ].join('\n') + '\n'
    );

    const exchanges = parseLastExchanges(filePath, 10);
    expect(exchanges).toHaveLength(4);
    expect(exchanges[0].role).toBe('human');
    expect(exchanges[0].content).toBe('Hello there');
    expect(exchanges[0].timestamp).toBeInstanceOf(Date);
    expect(exchanges[1].role).toBe('assistant');
    expect(exchanges[1].content).toBe('Hi! How can I help?');
  });

  it('returns only last N exchanges when count is limited', () => {
    const filePath = join(TEST_DIR, 'limited.jsonl');
    writeFileSync(
      filePath,
      [
        JSON.stringify({ type: 'human', content: 'first' }),
        JSON.stringify({ type: 'assistant', content: 'first reply' }),
        JSON.stringify({ type: 'human', content: 'second' }),
        JSON.stringify({ type: 'assistant', content: 'second reply' }),
      ].join('\n')
    );

    const exchanges = parseLastExchanges(filePath, 2);
    expect(exchanges).toHaveLength(2);
    expect(exchanges[0].content).toBe('second');
    expect(exchanges[1].content).toBe('second reply');
  });

  it('skips corrupted lines without crashing', () => {
    const filePath = join(TEST_DIR, 'corrupted.jsonl');
    writeFileSync(
      filePath,
      [
        JSON.stringify({ type: 'human', content: 'good line' }),
        '{bad json :::',
        '{"incomplete":',
        JSON.stringify({ type: 'assistant', content: 'still works' }),
      ].join('\n')
    );

    const exchanges = parseLastExchanges(filePath, 10);
    expect(exchanges).toHaveLength(2);
    expect(exchanges[0].content).toBe('good line');
    expect(exchanges[1].content).toBe('still works');
  });

  it('returns empty array for empty file', () => {
    const filePath = join(TEST_DIR, 'empty.jsonl');
    writeFileSync(filePath, '');

    const exchanges = parseLastExchanges(filePath, 10);
    expect(exchanges).toHaveLength(0);
  });

  it('returns empty array for non-existent file', () => {
    const exchanges = parseLastExchanges(join(TEST_DIR, 'nonexistent.jsonl'), 10);
    expect(exchanges).toHaveLength(0);
  });

  it('handles role field as alternative to type field', () => {
    const filePath = join(TEST_DIR, 'role-field.jsonl');
    writeFileSync(
      filePath,
      [
        JSON.stringify({ role: 'human', content: 'using role field' }),
        JSON.stringify({ role: 'assistant', content: 'also using role field' }),
      ].join('\n')
    );

    const exchanges = parseLastExchanges(filePath, 10);
    expect(exchanges).toHaveLength(2);
    expect(exchanges[0].role).toBe('human');
  });

  it('handles array content format', () => {
    const filePath = join(TEST_DIR, 'array-content.jsonl');
    writeFileSync(
      filePath,
      JSON.stringify({ type: 'human', content: [{ text: 'hello from array' }] }) + '\n'
    );

    const exchanges = parseLastExchanges(filePath, 10);
    expect(exchanges).toHaveLength(1);
    expect(exchanges[0].content).toBe('hello from array');
  });
});
