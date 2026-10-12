import 'server-only';
import { GSSOC_ORGANIZATIONS, type EventOrganization } from '@/lib/events';
import { fetchLiveRepos } from '@/lib/github';
import { getCurrentGsocProgram, getGsocHistory, getGsocOrganizations, type GsocOrganization } from '@/lib/gsoc';
import { toGitHubLanguage } from '@/lib/matching';
import type { Repository } from '@/types';

/** An organization's entry on a program's own published roster. */
export interface OfficialListing {
  program: 'gsoc';
  year: number;
  logo: string | null;
  /** The organization's page on the program site. */
  url: string;
  ideas: string | null;
  categories: string[];
  tech: string[];
}

export interface EnrichedOrganization extends EventOrganization {
  openIssues?: number;
  pushedAt?: string;
  archived?: boolean;
  license?: string | null;
  avatarUrl?: string;
  /** True when stars/activity came from GitHub just now, false for seed data. */
  live: boolean;
  goodFirstIssuesUrl: string;
  bountyIssuesUrl: string;
  /** Set when the organization is on a program's official roster (GSoC). */
  official?: OfficialListing;
}

const PROGRAM_TOPICS = new Set(['gsoc', 'gssoc', 'hacktoberfest', 'lfx', 'outreachy', 'mlh']);

/** "owner/repo" or "owner" from a GitHub URL; null for anything else. */
export function githubSlug(url: string | null | undefined): string | null {
  const match = url?.match(/^https:\/\/github\.com\/([A-Za-z0-9-]+)(?:\/([A-Za-z0-9._-]+?))?(?:\.git)?\/?(?:[?#].*)?$/);
  if (!match) return null;
  return match[2] ? `${match[1]}/${match[2]}` : match[1];
}

export function orgDeepLinks(slug: string) {
  // A whole GitHub organization: search issues across all of its repositories.
  if (!slug.includes('/')) {
    const search = (label: string) =>
      `https://github.com/search?type=issues&q=${encodeURIComponent(`org:${slug} is:issue is:open ${label}`)}`;
    return { goodFirstIssuesUrl: search('label:"good first issue"'), bountyIssuesUrl: search('label:bounty') };
  }
  const query = (label: string) =>
    `https://github.com/${slug}/issues?q=${encodeURIComponent(`is:issue is:open ${label}`)}`;
  return {
    goodFirstIssuesUrl: query('label:"good first issue"'),
    bountyIssuesUrl: query('label:bounty'),
  };
}

export function toEnrichedOrganization(org: EventOrganization, live?: Repository | null): EnrichedOrganization {
  return {
    ...org,
    stars: live?.stargazers_count ?? org.stars,
    forks: live?.forks_count ?? org.forks,
    language: live?.language || org.language,
    // Live topics are richer, but program tags (gsoc, lfx…) only exist in the seed.
    topics: live?.topics?.length
      ? Array.from(new Set([...live.topics, ...org.topics.filter(topic => PROGRAM_TOPICS.has(topic))]))
      : org.topics,
    description: live?.description || org.description,
    openIssues: live?.open_issues_count,
    pushedAt: live?.pushed_at,
    archived: (live as (Repository & { archived?: boolean }) | null | undefined)?.archived,
    license: live?.license?.spdx_id || null,
    avatarUrl: live?.owner?.avatar_url,
    live: Boolean(live),
    ...orgDeepLinks(org.slug),
  };
}

/**
 * One GitHub search with `repo:` qualifiers per batch replaces a REST call
 * per repository (qualifiers don't count toward the 256-char query limit).
 */
function techLanguage(tech: string[]): string {
  for (const tag of tech) {
    const name = toGitHubLanguage(tag);
    if (name) return name;
  }
  return '';
}

function listing(org: GsocOrganization, year: number): OfficialListing {
  return {
    program: 'gsoc',
    year,
    logo: org.logo,
    url: org.url,
    ideas: org.ideas,
    categories: org.categories,
    tech: org.tech,
  };
}

export async function getEnrichedOrganizations(options?: { eventLabel?: string }): Promise<{
  organizations: EnrichedOrganization[];
  liveCount: number;
  total: number;
  /** Organizations with a GitHub repository, i.e. the ones live stats can cover. */
  repoCount: number;
  rateLimited: boolean;
}> {
  let seeds = GSSOC_ORGANIZATIONS;
  const label = options?.eventLabel;
  if (label && label !== 'all') {
    seeds = seeds.filter(org => org.eventLabel === label || org.topics.includes(label));
  }

  // Google's own roster for the current GSoC edition; empty if the API is down.
  const gsoc = !label || label === 'all' || label === 'gsoc' ? await getCurrentGsocProgram() : null;
  const [rosterOrgs, history] = gsoc ? await Promise.all([getGsocOrganizations(gsoc.year), getGsocHistory()]) : [[], null];
  const roster = rosterOrgs.map(org => ({ org, slug: githubSlug(org.sourceCode) }));
  // Every GSoC edition an organization took part in (Google's archive), at least this one.
  const gsocYears = (org: GsocOrganization) =>
    Array.from(new Set([...(history?.yearsOf(org) ?? []), ...(gsoc ? [gsoc.year] : [])])).sort((a, b) => a - b);
  const repoSlugs = roster.map(entry => entry.slug).filter((slug): slug is string => Boolean(slug?.includes('/')));

  const { repos, rateLimited } = await fetchLiveRepos(
    Array.from(new Set([...seeds.map(o => o.slug), ...repoSlugs].map(slug => slug.toLowerCase())))
  );

  // Hand-picked organizations that are also on the roster carry both.
  const rosterBySlug = new Map(roster.filter(entry => entry.slug).map(entry => [entry.slug!.toLowerCase(), entry.org]));
  const merged = new Set<string>();
  const fromSeeds = seeds.map(seed => {
    const key = seed.slug.toLowerCase();
    const enriched = toEnrichedOrganization(seed, repos.get(key) ?? null);
    if (!gsoc) return enriched;
    // Same repository: one organization, both records merged.
    const exact = rosterBySlug.get(key);
    // Same GitHub owner (apache/kafka under the Apache Software Foundation):
    // the project takes part through its parent, which keeps its own entry.
    const parent = exact ? undefined : rosterBySlug.get(key.split('/')[0]);
    if (!exact && !parent) return enriched;
    if (exact) merged.add(exact.slug);
    return {
      ...enriched,
      topics: Array.from(new Set([...enriched.topics, 'gsoc'])),
      participationYears: Array.from(new Set([...(seed.participationYears ?? []), ...(exact ? gsocYears(exact) : [gsoc.year])])).sort(
        (a, b) => a - b
      ),
      ...(exact ? { official: listing(exact, gsoc.year) } : {}),
    };
  });

  const fromRoster: EnrichedOrganization[] = gsoc
    ? roster
        .filter(entry => !merged.has(entry.org.slug))
        .map(({ org, slug }) => {
          const live = slug ? repos.get(slug.toLowerCase()) ?? null : null;
          const enriched = toEnrichedOrganization(
            {
              name: org.name,
              slug: slug ?? org.slug,
              description: org.tagline,
              stars: 0,
              forks: 0,
              language: techLanguage(org.tech),
              topics: ['gsoc', ...org.topics],
              eventLabel: 'gsoc',
              participationYears: gsocYears(org),
            },
            live
          );
          return {
            ...enriched,
            avatarUrl: org.logo ?? enriched.avatarUrl,
            // Without a GitHub home, point at the ideas list and the GSoC page instead.
            ...(slug ? {} : { goodFirstIssuesUrl: org.ideas ?? org.url, bountyIssuesUrl: org.url }),
            official: listing(org, gsoc.year),
          };
        })
    : [];

  const organizations = [...fromSeeds, ...fromRoster]
    .filter(org => !org.archived)
    .sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  return {
    organizations,
    liveCount: organizations.filter(o => o.live).length,
    total: organizations.length,
    repoCount: organizations.filter(o => o.slug.includes('/')).length,
    rateLimited,
  };
}
