import type { ResumeAnalysisResult } from '@/lib/resume';
import { INTEREST_AREAS, toGitHubLanguage, type ExperienceLevel, type SkillProfile } from '@/lib/matching';
import type { Issue } from '@/types';

export type Step = 'upload' | 'review' | 'matches';

export const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'upload', label: 'Upload' },
  { id: 'review', label: 'Review skills' },
  { id: 'matches', label: 'Matches' },
];

/** Fallback until GET /api/resume reports the real limit. */
export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export interface UploadConfig {
  aiConfigured: boolean;
  maxBytes: number;
}

/** Successful POST /api/resume body. */
export interface ResumeResult {
  analysis: ResumeAnalysisResult;
  ai: { configured: boolean; requested: boolean; used: boolean };
}

export type SkillSource = { kind: 'resume'; fileName: string; ai: ResumeResult['ai'] } | { kind: 'saved' };

export interface RecommendedIssue extends Issue {
  matchScore: number;
  matchReasons: string[];
  repoLanguage: string | null;
}

export type MatchState =
  | { status: 'idle' }
  | { status: 'loading'; query: SkillProfile }
  | { status: 'error'; query: SkillProfile; message: string }
  | {
      status: 'done';
      query: SkillProfile;
      items: RecommendedIssue[];
      total: number;
      languages: string[];
      partial: boolean;
    };

const LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];
const AREA_VALUES = new Set(INTEREST_AREAS.map(area => area.value));

function uniqueCaseless(values: string[]) {
  const seen = new Set<string>();
  return values.filter(value => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const clean = (values: unknown) =>
  Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean) : [];

/** The reviewed profile we start from: GitHub spellings, known areas only. */
export function profileFromAnalysis(analysis: ResumeAnalysisResult): SkillProfile {
  return {
    languages: uniqueCaseless(clean(analysis.skills).map(skill => toGitHubLanguage(skill) ?? skill)),
    technologies: uniqueCaseless(clean(analysis.technologies)),
    interests: Array.from(new Set(clean(analysis.interests).filter(interest => AREA_VALUES.has(interest)))),
    experienceLevel: LEVELS.includes(analysis.experienceLevel) ? analysis.experienceLevel : 'beginner',
  };
}

/** Languages GitHub can filter by, in the order /api/issues/recommended uses them (max three). */
export function searchableLanguages(skills: SkillProfile) {
  return Array.from(
    new Set(skills.languages.map(toGitHubLanguage).filter((value): value is string => Boolean(value)))
  ).slice(0, 3);
}

/** The recommendations API needs a known language or at least one tool. */
export function canSearch(skills: SkillProfile) {
  return skills.technologies.length > 0 || searchableLanguages(skills).length > 0;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 || Number.isInteger(mb) ? Math.round(mb) : mb.toFixed(1)} MB`;
}

export const plural = (count: number, word: string) => `${count} ${count === 1 ? word : `${word}s`}`;
