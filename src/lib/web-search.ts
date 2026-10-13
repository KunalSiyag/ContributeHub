import 'server-only';
import { getSiteUrl } from './site';

/*
 * Free web search for the assistant. Stack Overflow, Wikipedia and Hacker
 * News have open search APIs that need no account and no payment, so
 * "Search the web" works on every deployment; Google Search grounding
 * (GEMINI_WEB_SEARCH=1) takes over where the Gemini plan includes it.
 * Only keywords from the question leave Orion. Results are written by
 * strangers, so they reach the model fenced off as data, and the reply
 * cites them by number so Orion can link the ones it used.
 */

export type WebSite = 'Stack Overflow' | 'Wikipedia' | 'Hacker News';

export interface WebResult {
  site: WebSite;
  title: string;
  url: string;
  /** Votes, points, a short description: helps the model weigh results. */
  detail: string;
  /** What the result says, as plain text. */
  text: string;
}

export interface WebSearch {
  /** The keywords sent to the search APIs. */
  terms: string;
  results: WebResult[];
}

/** A cited result, numbered as in the reply. */
export interface CitedSource {
  n: number;
  title: string;
  url: string;
}

const DAY = 86400;
const TIMEOUT_MS = 5000;
const MAX_TERMS = 8;

/** Function words and asking words; what's left is what the question is about. */
const STOP_WORDS = new Set(
  `a about above after again against all also am an and any are as at be because been before being below between both but by can
   could did do does doing done during each either else ever few for from further had has have having he her here hers him his how
   i if in into is it its itself just let me might more most must my myself no nor not now of off on once only or other our ours out
   over own please same she should so some still such tell than that the their theirs them then there these they this those through
   to too under until up upon us very was we were what whats when where which while who whom whose why will with within without
   would you your yours explain help know need needs want wants`.split(/\s+/)
);

/** Lowercase words, keeping "node.js", "c++" and "open-source" whole. */
const wordsOf = (text: string) => text.toLowerCase().match(/[a-z0-9][a-z0-9+#]*(?:[.'-][a-z0-9+#]+)*/g) ?? [];

/** Search keywords for a question; a short follow-up borrows the previous question's. */
export function searchTerms(question: string, previous?: string): string {
  const words = (text: string) => wordsOf(text.replace(/https?:\/\/\S+/g, ' ')).filter(word => !STOP_WORDS.has(word.replace(/'.*$/, '')));
  const own = [...new Set(words(question))].slice(0, MAX_TERMS);
  if (own.length >= 3 || !previous) return own.join(' ');
  const borrowed = [...new Set(words(previous))].filter(word => !own.includes(word)).slice(0, MAX_TERMS - own.length);
  return [...borrowed, ...own].join(' ');
}

/**
 * Whether a title shares a keyword with the search, give or take an ending
 * ("squashing" matches "squash"). The search APIs match whole pages, so an
 * article that merely mentions the words somewhere is left out.
 */
export function mentions(title: string, terms: string): boolean {
  const stem = (word: string) => word.slice(0, 5);
  const stems = new Set(wordsOf(title).map(stem));
  return terms.split(' ').some(term => term.length > 1 && stems.has(stem(term)));
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

/** HTML from a search API as plain text, at most `max` characters. */
export function plainText(html: string, max = 600): string {
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|pre|h[1-6]|blockquote|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? entity;
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return point > 31 && point < 0x110000 ? String.fromCodePoint(point) : ' ';
    })
    // A result can't close the fence it travels in, or open a new one.
    .replace(/<\s*\/?\s*web-results?\b[^>]*>?/gi, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n[\s]*/g, '\n')
    .trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}

/** An absolute http(s) link, normalised (so it can't carry raw markup), or null. */
function webUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

const count = (n: unknown, one: string, many: string) => {
  const value = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return `${value.toLocaleString('en-US')} ${value === 1 ? one : many}`;
};

/* ---------- Stack Overflow ---------- */

interface StackItem {
  item_type?: string;
  question_id?: number;
  answer_id?: number;
  title?: string;
  excerpt?: string;
  score?: number;
  is_answered?: boolean;
  has_accepted_answer?: boolean;
}

interface StackResult extends WebResult {
  /** A question with answers, whose best answer is worth reading. */
  answeredQuestion?: number;
}

/** Results from Stack Exchange's /search/excerpts; downvoted posts are left out. */
export function readStackOverflow(data: unknown, limit = 3): StackResult[] {
  const items = (data as { items?: StackItem[] } | null)?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter(item => typeof item?.title === 'string' && Number.isInteger(item.question_id) && (item.score ?? 0) >= 0)
    .slice(0, limit)
    .map(item => {
      const isAnswer = item.item_type === 'answer' && Number.isInteger(item.answer_id);
      const answered = Boolean(item.has_accepted_answer || item.is_answered);
      return {
        site: 'Stack Overflow' as const,
        title: `${isAnswer ? 'Answer: ' : ''}${plainText(item.title!, 160)}`,
        url: isAnswer ? `https://stackoverflow.com/a/${item.answer_id}` : `https://stackoverflow.com/q/${item.question_id}`,
        detail: [
          isAnswer ? 'an answer' : 'a question',
          count(item.score, 'vote', 'votes'),
          ...(isAnswer ? [] : [item.has_accepted_answer ? 'has an accepted answer' : answered ? 'answered' : 'no accepted answer']),
        ].join(', '),
        text: plainText(item.excerpt ?? '', 400),
        ...(!isAnswer && answered && { answeredQuestion: item.question_id }),
      };
    });
}

/** The body of the best answer from /questions/{id}/answers?filter=withbody. */
export function readTopAnswer(data: unknown): string | null {
  const answer = (data as { items?: Array<{ body?: unknown; score?: unknown; is_accepted?: unknown }> } | null)?.items?.[0];
  if (typeof answer?.body !== 'string') return null;
  const text = plainText(answer.body, 1200);
  return text ? `Top answer (${count(answer.score, 'vote', 'votes')}${answer.is_accepted ? ', accepted' : ''}): ${text}` : null;
}

/* ---------- Wikipedia ---------- */

/** A Wikipedia page key as a URL path segment (parentheses encoded, so Markdown links stay whole). */
const wikiPath = (key: string) =>
  encodeURIComponent(key.replace(/ /g, '_')).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

/** Results from Wikipedia's REST search (/w/rest.php/v1/search/page). */
export function readWikipedia(data: unknown, limit = 2): WebResult[] {
  const pages = (data as { pages?: Array<{ key?: unknown; title?: unknown; excerpt?: unknown; description?: unknown }> } | null)?.pages;
  if (!Array.isArray(pages)) return [];
  return pages
    .filter(page => typeof page?.key === 'string' && page.key && typeof page.title === 'string')
    .slice(0, limit)
    .map(page => ({
      site: 'Wikipedia' as const,
      title: plainText(page.title as string, 160),
      url: `https://en.wikipedia.org/wiki/${wikiPath(page.key as string)}`,
      detail: typeof page.description === 'string' && page.description.trim() ? `Wikipedia article: ${plainText(page.description, 120)}` : 'Wikipedia article',
      text: typeof page.excerpt === 'string' ? plainText(page.excerpt, 300) : '',
    }));
}

/** The lead of a Wikipedia article (/api/rest_v1/page/summary), unless it is a disambiguation page. */
export function readWikiSummary(data: unknown): string | null {
  const summary = data as { type?: unknown; extract?: unknown } | null;
  if (summary?.type === 'disambiguation' || typeof summary?.extract !== 'string') return null;
  return plainText(summary.extract, 800) || null;
}

/* ---------- Hacker News ---------- */

/** Stories from the Hacker News search API (hn.algolia.com). */
export function readHackerNews(data: unknown, limit = 2): WebResult[] {
  const hits = (data as { hits?: Array<Record<string, unknown>> } | null)?.hits;
  if (!Array.isArray(hits)) return [];
  return hits
    .filter(hit => typeof hit?.title === 'string' && typeof hit.objectID === 'string' && /^\d+$/.test(hit.objectID))
    .slice(0, limit)
    .map(hit => {
      const discussion = `https://news.ycombinator.com/item?id=${hit.objectID}`;
      const year = typeof hit.created_at === 'string' ? hit.created_at.slice(0, 4) : '';
      return {
        site: 'Hacker News' as const,
        title: plainText(hit.title as string, 160),
        url: webUrl(hit.url) ?? discussion,
        detail: [count(hit.points, 'point', 'points'), count(hit.num_comments, 'comment', 'comments'), year].filter(Boolean).join(', '),
        text: typeof hit.story_text === 'string' && hit.story_text ? plainText(hit.story_text, 400) : `Discussion: ${discussion}`,
      };
    });
}

/* ---------- Searching ---------- */

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': `Orion/1.0 (+${getSiteUrl()})` },
    next: { revalidate: DAY },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} answered ${response.status}`);
  return response.json();
}

/** STACKEXCHANGE_KEY (a free, public app key) raises the anonymous quota of 300 requests a day per IP. */
const stackParams = (params: Record<string, string>) => {
  const key = process.env.STACKEXCHANGE_KEY?.trim();
  return new URLSearchParams({ site: 'stackoverflow', ...params, ...(key && { key }) });
};

async function stackOverflow(terms: string): Promise<WebResult[]> {
  const found = readStackOverflow(await getJson(`https://api.stackexchange.com/2.3/search/excerpts?${stackParams({ order: 'desc', sort: 'relevance', q: terms, pagesize: '8' })}`), 8);
  const results = found.filter(result => mentions(result.title, terms)).slice(0, 3);
  const best = results.find(result => result.answeredQuestion);
  if (best) {
    try {
      const answers = await getJson(
        `https://api.stackexchange.com/2.3/questions/${best.answeredQuestion}/answers?${stackParams({ order: 'desc', sort: 'votes', filter: 'withbody', pagesize: '1' })}`
      );
      const answer = readTopAnswer(answers);
      if (answer) best.text = [best.text, answer].filter(Boolean).join('\n');
    } catch {
      // The question and its excerpt still help.
    }
  }
  return results.map(({ site, title, url, detail, text }) => ({ site, title, url, detail, text }));
}

async function wikipedia(terms: string): Promise<WebResult[]> {
  const found = readWikipedia(await getJson(`https://en.wikipedia.org/w/rest.php/v1/search/page?${new URLSearchParams({ q: terms, limit: '5' })}`), 5);
  const results = found.filter(result => mentions(`${result.title} ${result.detail}`, terms)).slice(0, 2);
  const top = results[0];
  if (top) {
    try {
      const lead = readWikiSummary(await getJson(top.url.replace('/wiki/', '/api/rest_v1/page/summary/')));
      if (lead) top.text = lead;
    } catch {
      // The search excerpt stays.
    }
  }
  return results;
}

/** Hacker News matches every word, so it gets the leading keywords only. */
async function hackerNews(terms: string): Promise<WebResult[]> {
  const query = terms.split(' ').slice(0, 4).join(' ');
  const found = readHackerNews(
    await getJson(`https://hn.algolia.com/api/v1/search?${new URLSearchParams({ query, tags: 'story', hitsPerPage: '5', numericFilters: 'points>5' })}`),
    5
  );
  return found.filter(result => mentions(result.title, query)).slice(0, 2);
}

/**
 * Searches Stack Overflow, Wikipedia and Hacker News for a question. Null
 * when none of them answered (offline, rate limited); an empty list when
 * they found nothing.
 */
export async function searchWeb(question: string, previous?: string): Promise<WebSearch | null> {
  const terms = searchTerms(question, previous);
  if (!terms) return { terms, results: [] };
  const settled = await Promise.allSettled([stackOverflow(terms), wikipedia(terms), hackerNews(terms)]);
  if (settled.every(outcome => outcome.status === 'rejected')) return null;
  const seen = new Set<string>();
  const results = settled
    .flatMap(outcome => (outcome.status === 'fulfilled' ? outcome.value : []))
    .filter(result => !seen.has(result.url) && seen.add(result.url));
  return { terms, results };
}

/** The search results as a context block, numbered for citations. */
export function webResultsContext({ terms, results }: WebSearch): string {
  const listed = results
    .map((result, i) => [`[${i + 1}] ${result.title} (${result.site}; ${result.detail})`, result.url, result.text].filter(Boolean).join('\n'))
    .join('\n\n');
  return `CONTEXT: a web search for "${terms}" on Stack Overflow, Wikipedia and Hacker News found these results. Use a result only when it helps answer the question, cite it as [n] right after the sentence it supports, and don't cite results you didn't use.\n<web-results>\n${listed}\n</web-results>`;
}

/** Parentheses and spaces in a URL would end a Markdown link early. */
const markdownUrl = (url: string) => url.replace(/[()\s]/g, char => (char === '(' ? '%28' : char === ')' ? '%29' : '%20'));

/** "[2]" or "[1, 3]", unless it is already a link ("[2](…)"). */
const CITATION = /\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\](?!\()/g;

/**
 * Turns the reply's [n] citations into links to the results and lists the
 * results it cited, in order. Code blocks and inline code are left alone.
 */
export function citeResults(reply: string, results: WebResult[]): { text: string; sources: CitedSource[] } {
  const cited: number[] = [];
  const link = (part: string) =>
    part.replace(CITATION, (marker, list: string, offset: number) => {
      const numbers = list.split(',').map(n => Number(n.trim()));
      // Neither "list[2]" nor an escaped bracket is a citation.
      if (/[\w\\]/.test(part[offset - 1] ?? '') || !numbers.every(n => n >= 1 && n <= results.length)) return marker;
      for (const n of numbers) if (!cited.includes(n)) cited.push(n);
      return `\\[${numbers.map(n => `[${n}](${markdownUrl(results[n - 1].url)})`).join(', ')}\\]`;
    });

  let inFence = false;
  const text = reply
    .split('\n')
    .map(line => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      return inFence ? line : line.split(/(`[^`]*`)/).map((part, i) => (i % 2 ? part : link(part))).join('');
    })
    .join('\n');

  return { text, sources: cited.map(n => ({ n, title: `${results[n - 1].title} · ${results[n - 1].site}`, url: results[n - 1].url })) };
}
