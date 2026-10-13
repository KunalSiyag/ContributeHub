import 'server-only';
import { RESOURCES } from './resources';

/*
 * Perks for open source projects (free plans, credits, programs), read daily
 * from Awesome OSS Perks (CC0, github.com/Aniket-508/awesome-oss-perks):
 * "- [Name](url) - description" lines under category headings. Perks Orion
 * checked by hand (lib/resources) are marked; an outage leaves just those.
 */

export const PERKS_SOURCE = 'https://github.com/Aniket-508/awesome-oss-perks';
const RAW = 'https://raw.githubusercontent.com/Aniket-508/awesome-oss-perks/main/README.md';
const STOP = /^(contents|contributing|cli telemetry|license|star history|more links)$/i;

export interface Perk {
  name: string;
  url: string;
  description: string;
  category: string;
  /** Also in Orion's hand-checked list. */
  checked: boolean;
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function parsePerks(markdown: string, checkedHosts: Set<string> = new Set()): Perk[] {
  const perks: Perk[] = [];
  let category: string | null = null;
  for (const line of markdown.split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      category = STOP.test(heading[1]) ? null : heading[1];
      continue;
    }
    if (!category) continue;
    const item = /^\s*[-*]\s+\[([^\]]{1,80})\]\((https:\/\/[^)\s]+)\)\s*[-–—:]\s*(.+?)\s*$/.exec(line);
    if (!item) continue;
    perks.push({
      name: item[1].trim(),
      url: item[2],
      description: item[3].replace(/\s+/g, ' ').slice(0, 400),
      category,
      checked: checkedHosts.has(host(item[2])),
    });
  }
  return perks;
}

/** Orion's own hand-checked perks, as Perk entries. */
function checkedPerks(): Perk[] {
  return RESOURCES.filter(resource => resource.category === 'perks').map(resource => ({
    name: resource.title,
    url: resource.url,
    description: resource.description,
    category: 'Checked by Orion',
    checked: true,
  }));
}

export async function getPerks(): Promise<{ perks: Perk[]; fromList: boolean }> {
  const ours = checkedPerks();
  const hosts = new Set(ours.map(perk => host(perk.url)));
  try {
    const response = await fetch(RAW, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { perks: ours, fromList: false };
    const listed = parsePerks(await response.text(), hosts);
    // Hand-checked perks the list doesn't have stay, under their own heading.
    const listedHosts = new Set(listed.map(perk => host(perk.url)));
    return { perks: [...listed, ...ours.filter(perk => !listedHosts.has(host(perk.url)))], fromList: listed.length > 0 };
  } catch {
    return { perks: ours, fromList: false };
  }
}
