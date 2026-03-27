import { describe, it, expect } from 'vitest';
import { encodePath } from '../../src/services/path-encoder.js';

describe('encodePath', () => {
  it('encodes a typical dev path', () => {
    expect(encodePath('/Users/hona.mind/Dev/playground/adhd-dev')).toBe(
      '-Users-hona-mind-Dev-playground-adhd-dev'
    );
  });

  it('encodes a short path', () => {
    expect(encodePath('/tmp/test')).toBe('-tmp-test');
  });

  it('replaces dots in path segments', () => {
    expect(encodePath('/Users/foo.bar/project')).toBe('-Users-foo-bar-project');
  });

  it('handles root path', () => {
    expect(encodePath('/')).toBe('-');
  });

  it('handles path with multiple dots', () => {
    expect(encodePath('/home/user.name.ext/code')).toBe('-home-user-name-ext-code');
  });
});
