import 'server-only';
import * as cheerio from 'cheerio';

const BLOCKED_TAGS = 'script, style, iframe, object, embed, form, link, meta, base, svg foreignObject';
const SAFE_URL = /^(https?:|mailto:|#|\/)/i;

/**
 * Sanitize GitHub-rendered issue HTML before injecting it. GitHub already
 * sanitizes markdown output; this is a second, local guarantee.
 */
export function sanitizeGitHubHtml(html: string): string {
  const $ = cheerio.load(html);
  $(BLOCKED_TAGS).remove();

  $('*').each((_, node) => {
    if (node.type !== 'tag') return;
    for (const name of Object.keys(node.attribs)) {
      const value = node.attribs[name] ?? '';
      if (name.startsWith('on') || name === 'style' || name === 'srcdoc') {
        $(node).removeAttr(name);
      } else if ((name === 'href' || name === 'src' || name === 'action' || name === 'formaction') && !SAFE_URL.test(value.trim())) {
        $(node).removeAttr(name);
      }
    }
  });

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (/^https?:/i.test(href)) $(el).attr({ target: '_blank', rel: 'noopener noreferrer nofollow' });
  });
  // Blank header cells in markdown tables aren't headers; screen readers would announce them as empty.
  $('th').each((_, el) => {
    if (!$(el).text().trim()) el.name = 'td';
  });
  $('img').attr('loading', 'lazy').attr('decoding', 'async');
  $('input').attr('disabled', 'disabled');

  return $('body').html() ?? '';
}
