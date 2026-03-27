import { existsSync, readFileSync } from 'node:fs';
import type { ParsedExchange } from '../models/types.js';

interface JsonlMessage {
  type?: string;
  role?: string;
  content?: unknown;
  message?: {
    content?: unknown;
    role?: string;
  };
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

function resolveRoleStr(obj: JsonlMessage): string | undefined {
  // Real Claude JSONL: { "type": "assistant", "message": { "role": "assistant", "content": [...] } }
  // Also check obj.type, obj.role, obj.message.role
  if (obj.type === 'human' || obj.type === 'assistant') return obj.type;
  if (obj.role === 'human' || obj.role === 'assistant') return obj.role;
  if (obj.message?.role === 'human' || obj.message?.role === 'assistant') return obj.message.role;
  return undefined;
}

function isHumanOrAssistant(obj: JsonlMessage): obj is JsonlMessage & { role: 'human' | 'assistant' } {
  const role = resolveRoleStr(obj);
  return role === 'human' || role === 'assistant';
}

function resolveRole(obj: JsonlMessage): 'human' | 'assistant' {
  return resolveRoleStr(obj) as 'human' | 'assistant';
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
      // Real Claude JSONL: content in obj.message.content; legacy: obj.content
      const rawContent = obj.message?.content ?? obj.content;
      const content = extractContent(rawContent);
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
