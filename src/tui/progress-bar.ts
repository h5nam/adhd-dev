const FILLED = '█';
const EMPTY = '░';

/**
 * Render a block-style progress bar.
 * @param percent - 0–100
 * @param width   - total character width of the bar
 */
export function renderProgressBar(percent: number, width: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return FILLED.repeat(filled) + EMPTY.repeat(width - filled);
}
