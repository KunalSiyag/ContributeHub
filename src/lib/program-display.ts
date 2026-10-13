import type { ContributionEvent, EventPhase } from '@/types';
import type { StatusTone } from '@/components/ui/primitives';

export const PHASE_DISPLAY: Record<EventPhase, { label: string; tone: StatusTone; live?: boolean }> = {
  'applications-open': { label: 'Applications open', tone: 'done', live: true },
  running: { label: 'Running', tone: 'review', live: true },
  'applications-closed': { label: 'Applications closed', tone: 'working' },
  'pre-announcement': { label: 'Opens soon', tone: 'neutral' },
  ended: { label: 'Ended', tone: 'neutral' },
};

export function phaseDisplay(event: ContributionEvent) {
  return PHASE_DISPLAY[event.phase ?? 'pre-announcement'];
}

export const PROGRAM_TYPE_LABEL: Record<ContributionEvent['type'], string> = {
  program: 'Program',
  fest: 'Month-long fest',
  mentorship: 'Mentorship',
};

const MONOGRAMS: Record<string, string> = {
  gsoc: 'GSoC',
  gssoc: 'GSSoC',
  hacktoberfest: 'HF',
  'mlh-fellowship': 'MLH',
  outreachy: 'OR',
  'lfx-mentorship': 'LFX',
  swoc: 'SWoC',
  '24pullrequests': '24PR',
};

/** Short mark shown in a program's monogram tile. */
export function programMonogram(event: Pick<ContributionEvent, 'programKey' | 'shortName'>) {
  return MONOGRAMS[event.programKey] ?? event.shortName.slice(0, 4).toUpperCase();
}

export interface DatesBasis {
  kind: 'official' | 'community' | 'expected' | 'usual';
  /** Short badge for cards and rows; null for the usual schedule. */
  badge: string | null;
  /** One sentence saying where the dates come from. */
  sentence: string;
  /** The page behind them. */
  url: string;
}

/** Where an edition's dates come from, in words, for badges, captions and feeds. */
export function datesBasis(event: Pick<ContributionEvent, 'officialSource' | 'communitySource' | 'projectedFrom' | 'website'>): DatesBasis {
  if (event.officialSource) {
    return { kind: 'official', badge: 'Official dates', sentence: 'Dates published by the program.', url: event.officialSource };
  }
  if (event.communitySource) {
    return {
      kind: 'community',
      badge: 'Community dates',
      sentence: 'Dates from the community-maintained program list.',
      url: event.communitySource,
    };
  }
  if (event.projectedFrom) {
    const { year, community, source } = event.projectedFrom;
    return {
      kind: 'expected',
      badge: 'Expected dates',
      sentence: `Not announced yet: these repeat ${year}'s ${community ? 'community-listed' : 'published'} dates.`,
      url: source,
    };
  }
  return { kind: 'usual', badge: null, sentence: "Dates follow the program's usual schedule.", url: event.website };
}
