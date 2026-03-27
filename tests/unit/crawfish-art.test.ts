import { describe, it, expect } from 'vitest';
import { getCrawfishArt } from '../../src/tui/crawfish-art.js';

describe('crawfish-art', () => {
  it('level 1 idle returns non-empty array', () => {
    const art = getCrawfishArt(1, 'idle');
    expect(art.length).toBeGreaterThanOrEqual(3);
  });
  it('level 2 returns non-empty array', () => {
    const art = getCrawfishArt(2, 'idle');
    expect(art.length).toBeGreaterThanOrEqual(3);
  });
  it('level 3 returns non-empty array', () => {
    const art = getCrawfishArt(3, 'idle');
    expect(art.length).toBeGreaterThanOrEqual(3);
  });
  it('level 4 returns non-empty array', () => {
    const art = getCrawfishArt(4, 'idle');
    expect(art.length).toBeGreaterThanOrEqual(3);
  });
  it('level 5 returns non-empty array', () => {
    const art = getCrawfishArt(5, 'idle');
    expect(art.length).toBeGreaterThanOrEqual(3);
  });
  it('working state has different art than idle', () => {
    const idle = getCrawfishArt(3, 'idle');
    const working = getCrawfishArt(3, 'working');
    expect(idle).not.toEqual(working);
  });
  it('complete state has different art than idle', () => {
    const idle = getCrawfishArt(3, 'idle');
    const complete = getCrawfishArt(3, 'complete');
    expect(idle).not.toEqual(complete);
  });
  it('returns level 1 art for invalid level 0', () => {
    const art = getCrawfishArt(0, 'idle');
    expect(art).toEqual(getCrawfishArt(1, 'idle'));
  });
  it('returns level 5 art for level > 5', () => {
    const art = getCrawfishArt(10, 'idle');
    expect(art).toEqual(getCrawfishArt(5, 'idle'));
  });
});
