import chalk from 'chalk';

const FILLED = '█';
const EMPTY = '░';

// Level thresholds (must match agent-tracker.ts)
const LEVEL_THRESHOLDS = [0, 1000, 10000, 50000, 200000];
const LEVEL_NAMES = ['Baby', 'Juvenile', 'Adult', 'Warrior', 'King'];

// Strip ANSI escape codes for visual width calculation
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

function levelColor(level: number): (s: string) => string {
  switch (level) {
    case 1: return chalk.gray;
    case 2: return chalk.cyan;
    case 3: return chalk.green;
    case 4: return chalk.yellow;
    case 5: return chalk.red.bold;
    default: return chalk.gray;
  }
}

function tokenLevel(tokens: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (tokens >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 100000) return `${(tokens / 1000).toFixed(1)}K`;
  if (tokens >= 10000) return `${(tokens / 1000).toFixed(1)}K`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${tokens}`;
}

export function renderTokenBar(current: number, max: number, width: number): string {
  const percent = max > 0 ? Math.min(1, current / max) : 0;
  const filledCount = Math.round(percent * width);
  const emptyCount = width - filledCount;

  const level = tokenLevel(current);
  const color = levelColor(level);

  return color(FILLED.repeat(filledCount)) + chalk.dim(EMPTY.repeat(emptyCount));
}

export function renderLevelProgress(level: number, tokens: number, delta = 0): string {
  const clampedLevel = Math.max(1, Math.min(5, level));
  const name = LEVEL_NAMES[clampedLevel - 1];
  const color = levelColor(clampedLevel);
  const barWidth = 10;

  // Delta indicator: green + for gains, red - for decay
  let deltaStr = '';
  if (delta > 100) {
    deltaStr = chalk.green(` +${formatTokenCount(delta)}↑`);
  } else if (delta < -100) {
    deltaStr = chalk.red(` ${formatTokenCount(delta)}↓`);
  }

  if (clampedLevel === 5) {
    const bar = color(FILLED.repeat(barWidth));
    const label = `${formatTokenCount(tokens)} tokens`;
    return `${color(`Lv5 ${name}`)} ${bar} ${label} ★${deltaStr}`;
  }

  const currentThreshold = LEVEL_THRESHOLDS[clampedLevel - 1];
  const nextThreshold = LEVEL_THRESHOLDS[clampedLevel];
  const progress = tokens - currentThreshold;
  const range = nextThreshold - currentThreshold;
  const bar = renderTokenBar(progress, range, barWidth);
  const currentFmt = formatTokenCount(tokens);
  const nextFmt = formatTokenCount(nextThreshold);

  return `${color(`Lv${clampedLevel} ${name}`)} ${bar} ${currentFmt}/${nextFmt}${deltaStr}`;
}

export function renderTokenHistogram(
  tokensPerSession: { name: string; tokens: number }[],
  width: number
): string[] {
  if (tokensPerSession.length === 0) return [];

  const sorted = [...tokensPerSession].sort((a, b) => b.tokens - a.tokens);
  const maxTokens = sorted[0].tokens;

  // Calculate label widths for alignment
  const maxNameLen = Math.max(...sorted.map((s) => s.name.length));
  const maxCountLen = Math.max(...sorted.map((s) => formatTokenCount(s.tokens).length));

  // Reserve space for: name + 2 spaces + bar + 2 spaces + count
  const barWidth = Math.max(1, width - maxNameLen - 2 - 2 - maxCountLen);

  return sorted.map(({ name, tokens }) => {
    const level = tokenLevel(tokens);
    const color = levelColor(level);
    const filledCount = maxTokens > 0 ? Math.round((tokens / maxTokens) * barWidth) : 0;
    const emptyCount = barWidth - filledCount;
    const bar = color(FILLED.repeat(filledCount)) + chalk.dim(EMPTY.repeat(emptyCount));
    const namePad = name.padEnd(maxNameLen);
    const countPad = formatTokenCount(tokens).padStart(maxCountLen);
    return `${namePad}  ${bar}  ${countPad}`;
  });
}
