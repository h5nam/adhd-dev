import { homedir } from 'node:os';
import { join } from 'node:path';

const HOME = homedir();

// ADHD-Dev data directory
export const ADHD_DEV_HOME = join(HOME, '.adhd-dev');
export const ADHD_DEV_CONFIG = join(ADHD_DEV_HOME, 'config.json');
export const ADHD_DEV_DB = join(ADHD_DEV_HOME, 'data.db');
export const ADHD_DEV_LOG_DIR = join(ADHD_DEV_HOME, 'logs');
export const ADHD_DEV_LOG_FILE = join(ADHD_DEV_LOG_DIR, 'adhd-dev.log');
export const ADHD_DEV_PID_FILE = join(ADHD_DEV_HOME, 'adhd-dev.pid');
export const ADHD_DEV_SOCKET = join(ADHD_DEV_HOME, 'adhd-dev.sock');
export const ADHD_DEV_TIMER_STATE = join(ADHD_DEV_HOME, 'timer-state.json');
export const ADHD_DEV_PROMPT_STATE = join(ADHD_DEV_HOME, 'prompt-state.json');
export const ADHD_DEV_EVENTS_LOG = join(ADHD_DEV_HOME, 'events.jsonl');
export const ADHD_DEV_HOOKS_DIR = join(ADHD_DEV_HOME, 'hooks');
export const ADHD_DEV_PATH_CACHE = join(ADHD_DEV_HOME, 'path-encoding-cache.json');

// Claude Code data directory
export const CLAUDE_HOME = join(HOME, '.claude');
export const CLAUDE_SESSIONS_DIR = join(CLAUDE_HOME, 'sessions');
export const CLAUDE_PROJECTS_DIR = join(CLAUDE_HOME, 'projects');
export const CLAUDE_SETTINGS = join(CLAUDE_HOME, 'settings.json');
