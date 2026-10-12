'use client';

import { useMemo } from 'react';
import type { EnrichedOrganization } from '@/lib/organizations';
import { PROGRAMS, type DiscoverState, type OrgSort, type ProgramKey } from './discover-state';

export interface OrganizationsView {
  /** Organizations after program, language and text filters, sorted. */
  visible: EnrichedOrganization[];
  /** How many organizations each program pill would show with the other filters applied. */
  programCounts: Map<ProgramKey, number>;
  /** Languages present in the roster, for the language select. */
  languages: string[];
}

const EMPTY: EnrichedOrganization[] = [];

function inProgram(org: EnrichedOrganization, program: ProgramKey) {
  return program === 'all' || org.eventLabel === program || org.topics.includes(program);
}

function matchesTerms(org: EnrichedOrganization, terms: string[]) {
  if (terms.length === 0) return true;
  const haystack = [org.name, org.slug, org.description, ...org.topics].join(' ').toLowerCase();
  return terms.every(term => haystack.includes(term));
}

function pushedTime(org: EnrichedOrganization) {
  const time = org.pushedAt ? Date.parse(org.pushedAt) : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

/** GSoC editions on record; only organizations on the current roster carry them. */
const gsocYears = (org: EnrichedOrganization) => (org.official ? (org.participationYears?.length ?? 1) : 0);

function sortOrganizations(list: EnrichedOrganization[], sort: OrgSort) {
  const sorted = [...list];
  if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  // Organizations without live data have no push date, so they sort last.
  else if (sort === 'active') sorted.sort((a, b) => pushedTime(b) - pushedTime(a) || b.stars - a.stars);
  else if (sort === 'gsoc-years') sorted.sort((a, b) => gsocYears(b) - gsocYears(a) || b.stars - a.stars);
  else sorted.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  return sorted;
}

/**
 * Client-side filtering for the organization roster. `text` is the live
 * search box value: the list is local, so results follow every keystroke.
 */
export function useOrganizationsView(
  organizations: EnrichedOrganization[] | undefined,
  state: Pick<DiscoverState, 'language' | 'program' | 'orgSort'>,
  text: string
): OrganizationsView {
  const all = organizations ?? EMPTY;
  const { language, program, orgSort } = state;

  const languages = useMemo(
    () =>
      Array.from(new Set(all.map(org => org.language).filter((name): name is string => Boolean(name)))).sort((a, b) =>
        a.localeCompare(b, 'en')
      ),
    [all]
  );

  const candidates = useMemo(() => {
    const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
    const wanted = language.toLowerCase();
    return all.filter(org => (!wanted || org.language?.toLowerCase() === wanted) && matchesTerms(org, terms));
  }, [all, language, text]);

  const programCounts = useMemo(
    () => new Map(PROGRAMS.map(entry => [entry.value, candidates.filter(org => inProgram(org, entry.value)).length])),
    [candidates]
  );

  const visible = useMemo(
    () => sortOrganizations(candidates.filter(org => inProgram(org, program)), orgSort),
    [candidates, program, orgSort]
  );

  return { visible, programCounts, languages };
}
