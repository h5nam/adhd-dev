export type SessionState = 'active' | 'idle' | 'stale' | 'orphan';

export interface ClaudeSessionFile {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
}

export interface DiscoveredSession {
  pid: number;
  sessionId: string;
  cwd: string;
  projectName: string;
  startedAt: Date;
  state: SessionState;
  lastActivity?: Date;
  jsonlPath?: string;
}

export interface ParsedExchange {
  role: 'human' | 'assistant';
  content: string;
  timestamp?: Date;
}

export type AgentState = 'working' | 'idle' | 'sleeping' | 'complete';

export interface AgentInfo {
  sessionId: string;
  projectName: string;
  cwd: string;
  state: AgentState;
  tokenUsage: number;       // effective (after decay)
  rawTokenUsage: number;    // original (no decay)
  level: number;
  currentTool: string | null;
  tools: string[];
  lastActivity: Date | null;
  startedAt: Date;
  lastExchange: string | null;
}

export interface TimerState {
  running: boolean;
  startedAt: number | null;
  durationMs: number;
  preset: string;
  flowMode: boolean;
  pausedAt: number | null;
}

export interface PromptState {
  pulse: string;
  badge: number;
  timer: string;
  timeOfDay: string;
  returnTo: string;
  warmth: string;
  updated: number;
}

export interface DailyStats {
  focusMinutes: number;
  completedSessions: number;
  date: string;
}
