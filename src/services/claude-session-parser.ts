import { existsSync, readFileSync } from 'node:fs';
import type { ParsedExchange } from '../models/types.js';

interface JsonlMessage {
  type?: string;
  role?: string;
  content?: unknown;
  timestamp?: string;
}

function extractContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object' && 'text' in c) return String((c as { text: unknown }).text);
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

function isHumanOrAssistant(obj: JsonlMessage): obj is JsonlMessage & { role: 'human' | 'assistant' } {
  const role = obj.type === 'human' || obj.type === 'assistant' ? obj.type : obj.role;
  return role === 'human' || role === 'assistant';
}

function resolveRole(obj: JsonlMessage): 'human' | 'assistant' {
  const r = obj.type === 'human' || obj.type === 'assistant' ? obj.type : obj.role;
  return r as 'human' | 'assistant';
}

/**
 * Parse the last `count` human/assistant exchanges from a Claude .jsonl transcript file.
 * Skips corrupted or incomplete lines gracefully.
 * Returns [] for empty or missing files.
 */
export function parseLastExchanges(jsonlPath: string, count: number): ParsedExchange[] {
  if (!existsSync(jsonlPath)) return [];

  let raw: string;
  try {
    raw = readFileSync(jsonlPath, 'utf-8');
  } catch {
    return [];
  }

  const lines = raw.split('\n');
  const exchanges: ParsedExchange[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as JsonlMessage;
      if (!isHumanOrAssistant(obj)) continue;
      const content = extractContent(obj.content);
      if (!content) continue;
      const exchange: ParsedExchange = {
        role: resolveRole(obj),
        content,
      };
      if (obj.timestamp) {
        const ts = new Date(obj.timestamp);
        if (!isNaN(ts.getTime())) exchange.timestamp = ts;
      }
      exchanges.push(exchange);
    } catch {
      // skip bad line
    }
  }

  // Return last `count` exchanges
  return exchanges.slice(-count);
}
