import readline from 'node:readline';
import chalk from 'chalk';
import { discoverAgents } from '../services/agent-tracker.js';
import { getStatus as getTimerStatus, start as timerStart, stop as timerStop } from '../services/timer-engine.js';
import { getTodayStats } from '../services/stats-aggregator.js';
import { readPromptState } from '../services/signal-emitter.js';
import { parseLastExchanges } from '../services/claude-session-parser.js';
import { getCrawfishArt, getCrawfishHires } from './crawfish-art.js';
import { renderLevelProgress, renderTokenHistogram, formatTokenCount } from './token-viz.js';
import { renderProgressBar } from './progress-bar.js';
import type { AgentInfo } from '../models/types.js';
import type { TimerStatus } from '../services/timer-engine.js';
import type { DailyStats, PromptState } from '../models/types.js';

// ANSI escape sequences
const ESC = '\x1b';
const ENTER_ALT_SCREEN = `${ESC}[?1049h`;
const EXIT_ALT_SCREEN = `${ESC}[?1049l`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const CLEAR_SCREEN = `${ESC}[2J`;
const MOVE_HOME = `${ESC}[H`;

// View modes
type ViewMode = 'grid' | 'detail';

// State
let viewMode: ViewMode = 'grid';
let selectedAgentIndex = -1;
const previousLevels = new Map<string, number>();
const levelUpFlash = new Map<string, number>(); // sessionId -> remaining flash cycles
let renderFrame = 0;

function stripAnsi(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function padRight(str: string, width: number): string {
  const visible = stripAnsi(str);
  const pad = Math.max(0, width - visible);
  return str + ' '.repeat(pad);
}

function formatTimerRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatAge(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1m ago';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return diffHr === 1 ? '1h ago' : `${diffHr}h ago`;
}

function stateColor(state: AgentInfo['state']): (s: string) => string {
  switch (state) {
    case 'working': return chalk.green;
    case 'idle': return chalk.yellow;
    case 'sleeping': return chalk.dim;
    case 'complete': return chalk.cyan;
    default: return (s: string) => s;
  }
}

function stateIcon(state: AgentInfo['state']): string {
  switch (state) {
    case 'working': return chalk.green('●');
    case 'idle': return chalk.yellow('◐');
    case 'sleeping': return chalk.dim('○');
    case 'complete': return chalk.cyan('✓');
    default: return '?';
  }
}

// Check and track level-ups
function trackLevelUps(agents: AgentInfo[]): void {
  for (const agent of agents) {
    const prev = previousLevels.get(agent.sessionId);
    if (prev !== undefined && agent.level > prev) {
      levelUpFlash.set(agent.sessionId, 3);
    }
    previousLevels.set(agent.sessionId, agent.level);
  }
}

// Decrement flash counters
function decrementFlash(): void {
  for (const [id, count] of levelUpFlash.entries()) {
    if (count <= 1) {
      levelUpFlash.delete(id);
    } else {
      levelUpFlash.set(id, count - 1);
    }
  }
}

const CARD_INNER_WIDTH = 30; // inner content width (fits compact halfblock art)
const CARD_WIDTH = CARD_INNER_WIDTH + 2; // includes border chars

function renderCard(agent: AgentInfo, index: number): string[] {
  const lines: string[] = [];
  const isFlashing = levelUpFlash.has(agent.sessionId);
  const borderColor = isFlashing ? chalk.yellowBright.bold : chalk.dim;

  // Top border with project name
  const titleLabel = ` ${agent.projectName} `;
  const titleVisible = titleLabel.length;
  const dashTotal = CARD_INNER_WIDTH - titleVisible - 1; // -1 for index number
  const indexLabel = `${index + 1}`;
  const rightDash = Math.max(0, dashTotal - indexLabel.length);
  const topBorder =
    borderColor('┌─') +
    chalk.bold(titleLabel) +
    borderColor('─'.repeat(Math.max(0, rightDash))) +
    chalk.dim(`${indexLabel}`) +
    borderColor('┐');
  lines.push(topBorder);

  function addCardLine(content: string): void {
    const pad = CARD_INNER_WIDTH - stripAnsi(content);
    lines.push(borderColor('│') + content + ' '.repeat(Math.max(0, pad)) + borderColor('│'));
  }

  // Crawfish art (compact halfblock for grid cards)
  const art = getCrawfishArt(agent.level, agent.state);
  for (const artLine of art) {
    const artVisible = stripAnsi(artLine);
    const leftPad = Math.floor((CARD_INNER_WIDTH - artVisible) / 2);
    addCardLine(' '.repeat(Math.max(0, leftPad)) + artLine);
  }

  addCardLine('');

  // Level progress
  const levelLine = renderLevelProgress(agent.level, agent.tokenUsage);
  // Truncate if too long
  const lvlVisible = stripAnsi(levelLine);
  if (lvlVisible <= CARD_INNER_WIDTH) {
    addCardLine(levelLine);
  } else {
    // Render a short version
    const shortLevel = `Lv${agent.level} ${formatTokenCount(agent.tokenUsage)}`;
    addCardLine(shortLevel);
  }

  // Tools
  if (agent.tools.length > 0) {
    const toolStr = `\uD83D\uDD27 ${agent.tools.slice(0, 3).join(', ')}`;
    const visible = stripAnsi(toolStr);
    if (visible <= CARD_INNER_WIDTH) {
      addCardLine(toolStr);
    } else {
      addCardLine(`\uD83D\uDD27 ${agent.tools.slice(0, 2).join(', ')}`);
    }
  }

  // State + activity keyword for working agents
  const stateStr = `${stateIcon(agent.state)} ${stateColor(agent.state)(agent.state)}`;
  if (agent.state === 'working' && agent.lastExchange) {
    // Show brief keyword of what the agent is doing
    const keyword = agent.lastExchange.slice(0, CARD_INNER_WIDTH - 4).split('\n')[0];
    addCardLine(stateStr);
    addCardLine(chalk.dim(`  "${keyword.length < agent.lastExchange.length ? keyword + '…' : keyword}"`));
  } else {
    addCardLine(stateStr);
  }

  // Bottom border
  lines.push(borderColor('└') + borderColor('─'.repeat(CARD_INNER_WIDTH)) + borderColor('┘'));

  return lines;
}

function renderHeader(
  promptState: PromptState,
  timer: TimerStatus,
  innerWidth: number,
): string {
  // Dopamine section
  const pulseStr = promptState.pulse
    ? `[${promptState.pulse}${promptState.badge > 0 ? promptState.badge : ''}]`
    : '';
  const dopamineParts: string[] = [];
  if (pulseStr) dopamineParts.push(pulseStr);
  if (promptState.timeOfDay) dopamineParts.push(promptState.timeOfDay);
  if (promptState.warmth) dopamineParts.push(promptState.warmth);
  const dopamineStr =
    dopamineParts.length > 0
      ? chalk.magenta(`Dopamine: ${dopamineParts.join(' | ')}`)
      : chalk.dim('Dopamine: —');

  // Timer section
  let timerStr: string;
  if (timer.running && timer.remainingMs > 0) {
    const elapsed = timer.elapsed;
    const total = elapsed + timer.remainingMs;
    const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
    const barWidth = 6;
    const bar = renderProgressBar(pct, barWidth);
    timerStr = chalk.cyan(`Timer: ${formatTimerRemaining(timer.remainingMs)} left `) +
      chalk.green(bar) + chalk.cyan(` ${pct}%`);
  } else {
    timerStr = chalk.dim('Timer: —');
  }

  const leftPart = `  ${dopamineStr}`;
  const rightPart = timerStr;
  const leftVisible = stripAnsi(leftPart);
  const rightVisible = stripAnsi(rightPart);
  const gap = Math.max(1, innerWidth - leftVisible - rightVisible);
  return leftPart + ' '.repeat(gap) + rightPart;
}

function renderGridView(
  agents: AgentInfo[],
  timer: TimerStatus,
  stats: DailyStats,
  promptState: PromptState,
): string[] {
  const cols = process.stdout.columns ?? 80;
  const rows = process.stdout.rows ?? 24;
  const twoColumn = cols >= 80;
  const innerWidth = twoColumn
    ? Math.min(cols - 2, (CARD_WIDTH * 2) + 6)
    : Math.min(cols - 2, CARD_WIDTH + 4);

  const outputLines: string[] = [];

  // Title border
  const titleStr = ' \uD83E\uDD9E ADHD-Dev Agent Dashboard ';
  const titleVisible = titleStr.length;
  const dashTotal = innerWidth - titleVisible;
  const leftDash = Math.floor(dashTotal / 2);
  const rightDash = dashTotal - leftDash;
  outputLines.push(
    chalk.dim('┌') +
      chalk.dim('─'.repeat(leftDash)) +
      chalk.bold(titleStr) +
      chalk.dim('─'.repeat(rightDash)) +
      chalk.dim('┐'),
  );

  function addLine(content: string): void {
    const pad = innerWidth - stripAnsi(content);
    outputLines.push(chalk.dim('│') + content + ' '.repeat(Math.max(0, pad)) + chalk.dim('│'));
  }

  // Header row
  addLine(renderHeader(promptState, timer, innerWidth));
  addLine(chalk.dim('─'.repeat(innerWidth)));
  addLine('');

  // Agent cards in grid
  if (agents.length === 0) {
    addLine(chalk.dim('  No active agents found'));
    addLine('');
  } else {
    if (twoColumn) {
      // 2-column layout
      for (let i = 0; i < agents.length; i += 2) {
        const leftAgent = agents[i];
        const rightAgent = agents[i + 1];
        const leftCard = renderCard(leftAgent, i);
        const rightCard = rightAgent ? renderCard(rightAgent, i + 1) : [];

        const maxCardLines = Math.max(leftCard.length, rightCard.length);
        for (let r = 0; r < maxCardLines; r++) {
          const leftLine = leftCard[r] ?? ' '.repeat(CARD_WIDTH);
          const rightLine = rightCard[r] ?? '';
          const combinedVisible = stripAnsi(leftLine) + 2 + (rightLine ? stripAnsi(rightLine) : 0);
          const pad = Math.max(0, innerWidth - combinedVisible);
          outputLines.push(
            chalk.dim('│') +
              '  ' +
              leftLine +
              '  ' +
              (rightLine || '') +
              ' '.repeat(pad) +
              chalk.dim('│'),
          );
        }
        addLine('');
      }
    } else {
      // 1-column layout
      for (let i = 0; i < agents.length; i++) {
        const card = renderCard(agents[i], i);
        for (const cardLine of card) {
          const pad = Math.max(0, innerWidth - 2 - stripAnsi(cardLine));
          outputLines.push(chalk.dim('│') + '  ' + cardLine + ' '.repeat(pad) + chalk.dim('│'));
        }
        addLine('');
      }
    }
  }

  // Footer stats
  const focusHours = Math.floor(stats.focusMinutes / 60);
  const focusMins = stats.focusMinutes % 60;
  const focusStr =
    focusHours > 0 ? `${focusHours}h ${focusMins}m focused` : `${focusMins}m focused`;
  const totalTokens = agents.reduce((sum, a) => sum + a.tokenUsage, 0);
  const statsLine = `  Today: ${chalk.green(focusStr)} | ${stats.completedSessions} sessions | Total: ${chalk.cyan(formatTokenCount(totalTokens))} tokens`;
  addLine(statsLine);

  addLine(chalk.dim('─'.repeat(innerWidth)));

  // Keybindings
  const keys = '[q]uit [r]efresh [t]imer [1-5]agent detail';
  addLine(`  ${chalk.dim(keys)}`);

  outputLines.push(chalk.dim('└') + chalk.dim('─'.repeat(innerWidth)) + chalk.dim('┘'));

  return outputLines;
}

function renderDetailView(agent: AgentInfo, innerWidth: number): string[] {
  const outputLines: string[] = [];

  const titleStr = ` \uD83E\uDD9E ${agent.projectName} — Detail `;
  const titleVisible = titleStr.length;
  const dashTotal = innerWidth - titleVisible;
  const leftDash = Math.floor(dashTotal / 2);
  const rightDash = dashTotal - leftDash;

  outputLines.push(
    chalk.dim('┌') +
      chalk.dim('─'.repeat(leftDash)) +
      chalk.bold(titleStr) +
      chalk.dim('─'.repeat(rightDash)) +
      chalk.dim('┐'),
  );

  function addLine(content: string): void {
    const pad = innerWidth - stripAnsi(content);
    outputLines.push(chalk.dim('│') + content + ' '.repeat(Math.max(0, pad)) + chalk.dim('│'));
  }

  addLine('');

  // Full crawfish art centered (high-res for detail view)
  const art = getCrawfishHires(agent.level, agent.state);
  for (const artLine of art) {
    const artVisible = stripAnsi(artLine);
    const leftPad = Math.floor((innerWidth - artVisible) / 2);
    addLine(' '.repeat(Math.max(0, leftPad)) + artLine);
  }

  addLine('');

  // Level progress
  addLine('  ' + renderLevelProgress(agent.level, agent.tokenUsage));

  // State + tool
  const stateStr = `  ${stateIcon(agent.state)} State: ${stateColor(agent.state)(agent.state)}`;
  addLine(stateStr);

  if (agent.currentTool) {
    addLine(`  \uD83D\uDD27 Current tool: ${chalk.cyan(agent.currentTool)}`);
  }

  // All tools
  if (agent.tools.length > 0) {
    addLine(`  Tools: ${agent.tools.join(', ')}`);
  }

  // Activity
  if (agent.lastActivity) {
    addLine(`  Last active: ${chalk.dim(formatAge(agent.lastActivity))}`);
  }
  addLine(`  Started: ${chalk.dim(formatAge(agent.startedAt))}`);

  addLine('');
  addLine(chalk.dim('  ' + '─'.repeat(innerWidth - 4)));
  addLine(`  ${chalk.bold('Token Histogram')}`);
  addLine('');

  // Token histogram (single agent, show relative usage over time — use a dummy representation)
  const histData = [{ name: agent.projectName, tokens: agent.tokenUsage }];
  const histLines = renderTokenHistogram(histData, innerWidth - 4);
  for (const hl of histLines) {
    addLine('  ' + hl);
  }

  addLine('');
  addLine(chalk.dim('  ' + '─'.repeat(innerWidth - 4)));
  addLine(`  ${chalk.bold('Last Exchange')}`);
  addLine('');

  // Last exchange
  if (agent.lastExchange) {
    const words = agent.lastExchange.slice(0, 200);
    const lineMaxLen = innerWidth - 4;
    // Simple word wrap
    const wrapped = wordWrap(words, lineMaxLen);
    for (const wl of wrapped) {
      addLine('  ' + chalk.dim(wl));
    }
  } else {
    addLine('  ' + chalk.dim('No exchanges yet'));
  }

  addLine('');
  addLine(chalk.dim('─'.repeat(innerWidth)));
  addLine(`  ${chalk.dim('[b]ack  [Esc]back  [q]uit')}`);

  outputLines.push(chalk.dim('└') + chalk.dim('─'.repeat(innerWidth)) + chalk.dim('┘'));

  return outputLines;
}

function wordWrap(text: string, maxLen: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxLen) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function renderDashboard(
  agents: AgentInfo[],
  timer: TimerStatus,
  stats: DailyStats,
  promptState: PromptState,
): void {
  const cols = process.stdout.columns ?? 80;
  const innerWidth = Math.max(50, Math.min(cols - 2, 78));

  let lines: string[];

  if (viewMode === 'detail' && selectedAgentIndex >= 0 && selectedAgentIndex < agents.length) {
    lines = renderDetailView(agents[selectedAgentIndex], innerWidth);
  } else {
    // Reset to grid if agent no longer exists
    if (viewMode === 'detail') {
      viewMode = 'grid';
      selectedAgentIndex = -1;
    }
    lines = renderGridView(agents, timer, stats, promptState);
  }

  const output = CLEAR_SCREEN + MOVE_HOME + lines.join('\n') + '\n';
  process.stdout.write(output);

  // Timestamp below box
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  process.stdout.write(chalk.dim(`  Last refresh: ${ts}  `) + '\n');
}

let cachedAgents: AgentInfo[] = [];

async function refresh(): Promise<void> {
  const [agents, timer, stats, promptState] = await Promise.all([
    discoverAgents(),
    Promise.resolve(getTimerStatus()),
    Promise.resolve(getTodayStats()),
    Promise.resolve(readPromptState()),
  ]);

  trackLevelUps(agents);
  cachedAgents = agents;
  renderFrame++;
  renderDashboard(agents, timer, stats, promptState);
  decrementFlash();
}

function cleanup(): void {
  process.stdout.write(SHOW_CURSOR + EXIT_ALT_SCREEN);
}

export async function startDashboard(): Promise<void> {
  process.stdout.write(ENTER_ALT_SCREEN + HIDE_CURSOR);

  await refresh();

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  let refreshInterval: ReturnType<typeof setInterval> | undefined;

  const handleKey = async (str: string, keyName?: string): Promise<void> => {
    switch (str) {
      case 'q':
      case '\x03': // Ctrl-C
        if (refreshInterval !== undefined) clearInterval(refreshInterval);
        cleanup();
        process.exit(0);
        break;

      case 'b':
      case '\x1b': // Esc
        viewMode = 'grid';
        selectedAgentIndex = -1;
        await refresh();
        break;

      case 't': {
        const status = getTimerStatus();
        if (status.running) {
          timerStop();
        } else {
          timerStart(25, 'pomodoro');
        }
        await refresh();
        break;
      }

      case 'r':
        await refresh();
        break;

      case '1':
      case '2':
      case '3':
      case '4':
      case '5': {
        const idx = parseInt(str, 10) - 1;
        if (idx >= 0 && idx < cachedAgents.length) {
          viewMode = 'detail';
          selectedAgentIndex = idx;
          await refresh();
        }
        break;
      }

      default:
        // Handle Escape via keyName
        if (keyName === 'escape') {
          viewMode = 'grid';
          selectedAgentIndex = -1;
          await refresh();
        }
        break;
    }
  };

  process.stdin.on('keypress', (_ch, key) => {
    if (key) {
      void handleKey(key.sequence ?? key.name ?? '', key.name);
    }
  });

  // Auto-refresh every 2 seconds
  refreshInterval = setInterval(() => {
    void refresh();
  }, 2000);

  process.once('SIGINT', () => {
    if (refreshInterval !== undefined) clearInterval(refreshInterval);
    cleanup();
    process.exit(0);
  });
  process.once('SIGTERM', () => {
    if (refreshInterval !== undefined) clearInterval(refreshInterval);
    cleanup();
    process.exit(0);
  });
}
