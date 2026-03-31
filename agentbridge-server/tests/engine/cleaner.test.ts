import { describe, it, expect } from 'vitest';
import { applyChineseCompression, compressForTokens } from '../../src/engine/cleaner.js';

describe('applyChineseCompression', () => {
  it('should compress standard keys to Chinese', () => {
    const input = { header: 'title' };
    const { result, replacements } = applyChineseCompression(input);
    expect((result as Record<string, string>)['页头']).toBe('标题');
    expect(replacements).toBe(2);
  });

  it('should preserve patterns that should not be compressed', () => {
    const input = { url: 'https://example.com', color: '#ff0000', label: 'Very long text that should not be matched as short string' };
    const { result, replacements } = applyChineseCompression(input);
    expect(replacements).toBe(1); // 'label' key is compressed
  });
});

describe('compressForTokens', () => {
  it('should clean up multiple newlines and spaces', () => {
    const input = 'This   is\n\n\n\nspaced   out.';
    const result = compressForTokens(input);
    expect(result).toBe('This is\nspaced out.');
  });
});
