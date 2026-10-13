import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from './Markdown';

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} />);

describe('assistant Markdown', () => {
  it('renders the supported subset', () => {
    const out = html('## Set up\n\n1. Clone it\n2. Run `npm test`\n\nSee **CONTRIBUTING** and [the docs](https://example.com).\n\n```bash\nnpm install\n```');
    expect(out).toContain('<ol');
    expect(out).toContain('<code>npm test</code>');
    expect(out).toContain('<strong>CONTRIBUTING</strong>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('npm install');
  });

  it('never emits markup or unsafe links from the text', () => {
    const out = html('<img src=x onerror=alert(1)> [click](javascript:alert(1)) <script>alert(1)</script>');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('href="javascript');
    expect(out).toContain('&lt;script&gt;');
  });

  it('keeps site links in the same tab', () => {
    expect(html('[programs](/events)')).toContain('<a href="/events">programs</a>');
  });
});

describe('assistant Markdown details', () => {
  it('formats inside link labels and honours escapes', () => {
    expect(html('[Guide (`CONTRIBUTING.md`)](https://x.dev)')).toContain('<a href="https://x.dev" target="_blank" rel="noopener noreferrer">Guide (<code>CONTRIBUTING.md</code>)</a>');
    expect(html('Use \\`npm\\` and \\*stars\\*')).toContain('Use `npm` and *stars*');
  });
});

describe('Markdown quotes', () => {
  it('renders quoted lines as one quote', () => {
    const out = html("Intro\n> **Tip:** merge public branches,\n> rebase local ones.\n\nAfter");
    expect(out).toContain('<blockquote');
    expect(out).toContain('><strong>Tip:</strong> merge public branches, rebase local ones.</blockquote>');
    expect(out).not.toContain('&gt;');
    expect(out).toMatch(/<p[^>]*>Intro<\/p><blockquote/);
  });
});

describe('Markdown images', () => {
  it('shows images from allowed hosts only where a page allows them', () => {
    const text = 'Look: ![the bug](https://github.com/user-attachments/assets/abc) and ![x](https://evil.example/t.png)';
    const withImages = renderToStaticMarkup(<Markdown text={text} images />);
    expect(withImages).toContain('<img src="https://github.com/user-attachments/assets/abc" alt="the bug" loading="lazy" decoding="async" referrerPolicy="no-referrer"');
    expect(withImages).not.toContain('evil.example');
    expect(withImages).toContain('x');
    const assistant = renderToStaticMarkup(<Markdown text={text} />);
    expect(assistant).not.toContain('<img');
    expect(assistant).toContain('the bug');
  });
});
