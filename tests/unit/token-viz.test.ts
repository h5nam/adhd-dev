import { describe, it, expect } from 'vitest';
import { renderTokenBar, renderLevelProgress, formatTokenCount } from '../../src/tui/token-viz.js';

describe('token-viz', () => {
  describe('formatTokenCount', () => {
    it('formats small numbers', () => {
      expect(formatTokenCount(123)).toBe('123');
    });
    it('formats thousands', () => {
      expect(formatTokenCount(1234)).toBe('1.2K');
    });
    it('formats large numbers', () => {
      expect(formatTokenCount(123456)).toBe('123.5K');
    });
    it('formats zero', () => {
      expect(formatTokenCount(0)).toBe('0');
    });
  });

  describe('renderTokenBar', () => {
    it('renders half-filled bar', () => {
      const bar = renderTokenBar(500, 1000, 20);
      // Should contain 10 filled + 10 empty (approximately)
      expect(bar.length).toBeGreaterThan(0);
    });
    it('renders empty bar for 0', () => {
      const bar = renderTokenBar(0, 1000, 10);
      expect(bar).toContain('░');
    });
    it('renders full bar', () => {
      const bar = renderTokenBar(1000, 1000, 10);
      expect(bar).toContain('█');
    });
  });

  describe('renderLevelProgress', () => {
    it('shows level and progress', () => {
      const result = renderLevelProgress(3, 35000);
      expect(result).toContain('Lv3');
      expect(result).toContain('Adult');
    });
    it('shows star at max level', () => {
      const result = renderLevelProgress(5, 250000);
      expect(result).toContain('★');
    });
  });
});
