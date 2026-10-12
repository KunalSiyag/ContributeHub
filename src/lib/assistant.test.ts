import { describe, expect, it } from 'vitest';
import { repoMention } from './assistant';

describe('assistant repository detection', () => {
  it.each([
    ['Explain zulip/zulip please', 'zulip/zulip'],
    ['what is https://github.com/vercel/next.js/tree/canary about?', 'vercel/next.js'],
    ['How do I start with mermaid-js/mermaid?', 'mermaid-js/mermaid'],
    ['How do I write a GSoC proposal?', null],
    ['Is 2026/27 a good year?', null],
  ])('%s', (text, expected) => {
    expect(repoMention(text)).toBe(expected);
  });
});
