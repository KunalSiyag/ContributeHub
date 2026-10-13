import { Fragment, type ReactNode } from 'react';
import styles from './Markdown.module.css';

/**
 * A small Markdown renderer for assistant replies and forum posts:
 * paragraphs, headings, lists, quotes, fenced code, inline code, bold, italics, links
 * and, where a page allows them, images. It builds React elements (never
 * HTML strings), so model output can't inject markup, and links are limited
 * to http(s) and site-relative paths.
 */

const SAFE_HREF = /^(https?:\/\/|\/(?!\/))/i;

/**
 * Images only from the hosts people paste screenshots from (GitHub
 * attachments and Imgur). Assistant replies never show images, so model
 * output can't leak data through an image URL.
 */
const IMAGE_SOURCE =
  /^https:\/\/(user-images\.githubusercontent\.com|private-user-images\.githubusercontent\.com|raw\.githubusercontent\.com|avatars\.githubusercontent\.com|i\.imgur\.com|github\.com\/user-attachments\/assets)\//i;

/** Backslash-escaped characters (such as an escaped backtick or asterisk) travel as private-use stand-ins until rendering. */
const ESCAPABLE = '\\`*_[]()#+-.!';
const hide = (text: string) => text.replace(/\\([\\`*_[\]()#+\-.!])/g, (_, char: string) => String.fromCharCode(0xe000 + ESCAPABLE.indexOf(char)));
const show = (text: string) => text.replace(/[\ue000-\ue00f]/g, char => ESCAPABLE[char.charCodeAt(0) - 0xe000]);

function inline(raw: string, keyBase: string, links = true, images = false): ReactNode[] {
  const text = hide(raw);
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(!\[[^\]]*\]\([^)\s]+\))|(\[[^\]]+\]\([^)\s]+\))|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(show(text.slice(last, match.index)));
    const token = match[0];
    const key = `${keyBase}-${i++}`;
    if (token.startsWith('`')) nodes.push(<code key={key}>{show(token.slice(1, -1))}</code>);
    else if (token.startsWith('**')) nodes.push(<strong key={key}>{inline(token.slice(2, -2), key, links, images)}</strong>);
    else if (token.startsWith('![')) {
      const [, alt = '', src = ''] = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token) ?? [];
      const source = show(src);
      nodes.push(
        images && IMAGE_SOURCE.test(source) ? (
          // eslint-disable-next-line @next/next/no-img-element -- user images of unknown size from allowlisted hosts
          <img key={key} src={source} alt={show(alt)} loading="lazy" decoding="async" referrerPolicy="no-referrer" className={styles.image} />
        ) : (
          <Fragment key={key}>{show(alt) || show(token)}</Fragment>
        )
      );
    } else if (token.startsWith('[')) {
      const [, label = token, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token) ?? [];
      const target = href ? show(href) : '';
      nodes.push(
        links && target && SAFE_HREF.test(target) ? (
          <a key={key} href={target} {...(target.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
            {inline(label, key, false)}
          </a>
        ) : (
          <Fragment key={key}>{inline(label, key, false)}</Fragment>
        )
      );
    } else nodes.push(<em key={key}>{inline(token.slice(1, -1), key, links, images)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(show(text.slice(last)));
  return nodes;
}

export default function Markdown({ text, images = false }: { text: string; images?: boolean }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      const lang = line.trim().slice(3).trim();
      const code: string[] = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) code.push(lines[i]);
      i++;
      blocks.push(
        <pre key={key++} className={styles.pre} data-lang={lang || undefined}>
          <code>{code.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(
        <p key={key++} className={styles.heading}>
          {inline(heading[2], `h${key}`, true, images)}
        </p>
      );
      i++;
      continue;
    }

    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ''));
        i++;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={key++} className={styles.list}>
          {items.map((item, n) => (
            <li key={n}>{inline(item, `l${key}-${n}`, true, images)}</li>
          ))}
        </List>
      );
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        const part = lines[i].replace(/^\s*>\s?/, '').trim();
        if (part) quote.push(part);
        i++;
      }
      blocks.push(
        <blockquote key={key++} className={styles.quote}>
          {quote.map((part, n) => (
            <Fragment key={n}>
              {n > 0 && ' '}
              {inline(part, `q${key}-${n}`, true, images)}
            </Fragment>
          ))}
        </blockquote>
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(```|#{1,6}\s|[-*+]\s|\d+[.)]\s|>)/.test(lines[i])) {
      paragraph.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={key++} className={styles.paragraph}>
        {paragraph.map((part, n) => (
          <Fragment key={n}>
            {n > 0 && ' '}
            {inline(part, `p${key}-${n}`, true, images)}
          </Fragment>
        ))}
      </p>
    );
  }

  return <div className={styles.markdown}>{blocks}</div>;
}
