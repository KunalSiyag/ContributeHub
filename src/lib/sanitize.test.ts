import { describe, expect, it } from 'vitest';
import { sanitizeGitHubHtml } from '@/lib/sanitize';

describe('sanitizeGitHubHtml', () => {
  it('removes scripts, event handlers and javascript: URLs', () => {
    const html = sanitizeGitHubHtml(
      '<p onclick="alert(1)">Hi<script>alert(2)</script></p><a href="javascript:alert(3)">x</a><img src="javascript:bad" onerror="x()">'
    );
    expect(html).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(html).toContain('<p>Hi</p>');
  });

  it('opens external links in a new tab and keeps safe content', () => {
    const html = sanitizeGitHubHtml('<a href="https://github.com">gh</a><code>x</code><input type="checkbox" checked>');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('<code>x</code>');
    expect(html).toContain('disabled');
  });

  it('drops iframes and inline styles', () => {
    const html = sanitizeGitHubHtml('<iframe src="https://evil"></iframe><div style="position:fixed">a</div>');
    expect(html).not.toContain('iframe');
    expect(html).not.toContain('style=');
  });

  it('turns blank table header cells into data cells', () => {
    const html = sanitizeGitHubHtml('<table><thead><tr><th></th><th>Name</th></tr></thead></table>');
    expect(html).toContain('<td></td><th>Name</th>');
  });
});
