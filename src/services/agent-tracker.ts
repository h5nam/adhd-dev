import { existsSync, readFileSync, statSync } from 'node:fs';
import { discoverSessions } from './claude-session-discovery.js';
import { parseLastExchanges } from './claude-session-parser.js';
import type { AgentInfo, AgentState } from '../models/types.js';

// Level thresholds: tokens required to reach each level (Lv1-Lv5)
export const LEVEL_THRESHOLDS = [0, 1000, 10000, 50000, 200000];

export function calculateLevel(tokens: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (tokens >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

// Token decay: inactive agents slowly lose effective tokens
// - idle: 2% per hour (user may come back soon)
// - sleeping: 5% per hour (truly inactive — level drops faster)
// Returns the decayed token count (display only — actual jsonl tokens unchanged)
const DECAY_RATE_IDLE = 0.02;    // 2% per hour
const DECAY_RATE_SLEEPING = 0.05; // 5% per hour

function applyTokenDecay(tokens: number, state: AgentState, inactiveMs: number): number {
  if (state === 'working' || state === 'complete') return tokens;
  if (inactiveMs <= 0 || tokens <= 0) return tokens;

  const hours = inactiveMs / (60 * 60 * 1000);
  const rate = state === 'sleeping' ? DECAY_RATE_SLEEPING : DECAY_RATE_IDLE;

  // Exponential decay: tokens * (1 - rate)^hours
  // Floor at level 1 threshold (never drop below Lv1)
  const decayed = tokens * Math.pow(1 - rate, hours);
  return Math.max(0, Math.floor(decayed));
}

// Actual Claude Code .jsonl format:
// { "message": { "usage": { "input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens" }, "content": [{ "type": "tool_use", "name": "..." }] }, "type": "assistant" }
interface JsonlEntry {
  type?: string;
  message?: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    content?: Array<{ type?: string; name?: string }>;
  };
  // Legacy/test format support
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  tool_use?: Array<{ name?: string }>;
}

function getUsage(obj: JsonlEntry): { input: number; output: number } {
  // Real format: message.usage
  // Note: only count input_tokens + output_tokens (actual API usage)
  // Exclude cache_creation/read tokens — those are system optimization, not user work
  const mu = obj.message?.usage;
  if (mu) {
    return {
      input: mu.input_tokens ?? 0,
      output: mu.output_tokens ?? 0,
    };
  }
  // Legacy/test format: top-level usage
  const u = obj.usage;
  if (u) {
    return { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0 };
  }
  return { input: 0, output: 0 };
}

function getToolNames(obj: JsonlEntry): string[] {
  const names: string[] = [];
  // Real format: message.content[].type === "tool_use"
  if (obj.message?.content && Array.isArray(obj.message.content)) {
    for (const block of obj.message.content) {
      if (block.type === 'tool_use' && block.name) {
        names.push(block.name);
      }
    }
  }
  // Legacy/test format: top-level tool_use[]
  if (obj.tool_use && Array.isArray(obj.tool_use)) {
    for (const t of obj.tool_use) {
      if (t.name) names.push(t.name);
    }
  }
  return names;
}

export function countTokensFromJsonl(jsonlPath: string): number {
  if (!existsSync(jsonlPath)) return 0;

  let raw: string;
  try {
    raw = readFileSync(jsonlPath, 'utf-8');
  } catch {
    return 0;
  }

  let total = 0;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as JsonlEntry;
      const usage = getUsage(obj);
      total += usage.input + usage.output;
    } catch {
      // skip corrupted lines
    }
  }
  return total;
}

export function extractCurrentTool(jsonlPath: string): string | null {
  if (!existsSync(jsonlPath)) return null;

  let raw: string;
  try {
    raw = readFileSync(jsonlPath, 'utf-8');
  } catch {
    return null;
  }

  const lines = raw.split('\n').filter((l) => l.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]) as JsonlEntry;
      const tools = getToolNames(obj);
      if (tools.length > 0) return tools[tools.length - 1];
    } catch {
      // skip
    }
  }
  return null;
}

export function extractRecentTools(jsonlPath: string, limit = 5): string[] {
  if (!existsSync(jsonlPath)) return [];

  let raw: string;
  try {
    raw = readFileSync(jsonlPath, 'utf-8');
  } catch {
    return [];
  }

  const lines = raw.split('\n').filter((l) => l.trim());
  const seen = new Set<string>();
  const tools: string[] = [];

  for (let i = lines.length - 1; i >= 0 && tools.length < limit; i--) {
    try {
      const obj = JSON.parse(lines[i]) as JsonlEntry;
      for (const name of getToolNames(obj)) {
        if (!seen.has(name)) {
          seen.add(name);
          tools.push(name);
          if (tools.length >= limit) break;
        }
      }
    } catch {
      // skip
    }
  }

  return tools;
}

const WORKING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes — Claude writes during response generation
const IDLE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes — user may be typing/thinking

export async function discoverAgents(overrideSessionsDir?: string): Promise<AgentInfo[]> {
  const sessions = await discoverSessions(overrideSessionsDir);
  const now = Date.now();

  const agents: AgentInfo[] = [];

  for (const session of sessions) {
    const jsonlPath = session.jsonlPath;
    const rawTokens = jsonlPath ? countTokensFromJsonl(jsonlPath) : 0;

    let state: AgentState;
    let inactiveMs = 0;
    if (session.state === 'active') {
      if (jsonlPath) {
        try {
          const st = statSync(jsonlPath);
          const ageMs = now - st.mtime.getTime();
          inactiveMs = ageMs;
          if (ageMs <= WORKING_THRESHOLD_MS) {
            state = 'working';
          } else if (ageMs <= IDLE_THRESHOLD_MS) {
            state = 'idle';
          } else {
            state = 'sleeping';
          }
        } catch {
          state = 'idle';
        }
      } else {
        state = 'idle';
      }
    } else if (session.state === 'idle') {
      state = 'idle';
      // Use lastActivity to calculate inactive time
      inactiveMs = session.lastActivity ? now - session.lastActivity.getTime() : 0;
    } else {
      // stale or orphan
      state = 'sleeping';
      inactiveMs = session.lastActivity ? now - session.lastActivity.getTime() : 0;
    }

    // Apply token decay for inactive agents
    const tokenUsage = applyTokenDecay(rawTokens, state, inactiveMs);
    const level = calculateLevel(tokenUsage);

    const currentTool = jsonlPath ? extractCurrentTool(jsonlPath) : null;
    const tools = jsonlPath ? extractRecentTools(jsonlPath) : [];

    let lastExchange: string | null = null;
    if (jsonlPath) {
      // Get last few exchanges to find the most recent assistant message
      const exchanges = parseLastExchanges(jsonlPath, 5);
      for (let i = exchanges.length - 1; i >= 0; i--) {
        if (exchanges[i].role === 'assistant' && exchanges[i].content.trim()) {
          lastExchange = exchanges[i].content;
          break;
        }
      }
    }

    agents.push({
      sessionId: session.sessionId,
      projectName: session.projectName,
      cwd: session.cwd,
      state,
      tokenUsage,
      rawTokenUsage: rawTokens,
      level,
      currentTool,
      tools,
      lastActivity: session.lastActivity ?? null,
      startedAt: session.startedAt,
      lastExchange,
    });
  }

  // Deduplicate: for same projectName, keep the most recently active one
  const byProject = new Map<string, AgentInfo>();
  for (const agent of agents) {
    const existing = byProject.get(agent.projectName);
    if (!existing) {
      byProject.set(agent.projectName, agent);
    } else {
      // Prefer working > idle > sleeping, then most recent activity
      const stateRank: Record<AgentState, number> = { working: 0, idle: 1, sleeping: 2, complete: 3 };
      const existingRank = stateRank[existing.state];
      const newRank = stateRank[agent.state];
      if (newRank < existingRank) {
        byProject.set(agent.projectName, agent);
      } else if (newRank === existingRank) {
        const existingTime = existing.lastActivity?.getTime() ?? 0;
        const newTime = agent.lastActivity?.getTime() ?? 0;
        if (newTime > existingTime) {
          byProject.set(agent.projectName, agent);
        }
      }
    }
  }

  const deduplicated = Array.from(byProject.values());

  // Sort: working first, then idle, then sleeping/complete
  const stateOrder: Record<AgentState, number> = { working: 0, idle: 1, sleeping: 2, complete: 3 };
  deduplicated.sort((a, b) => stateOrder[a.state] - stateOrder[b.state]);

  return deduplicated;
}
