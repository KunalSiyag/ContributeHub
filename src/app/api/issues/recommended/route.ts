import { NextResponse } from 'next/server';
import { buildIssueQuery, GitHubError, repoFullName, searchIssues } from '@/lib/github';
import { errorResponse, jsonError, readJson } from '@/lib/api';
import { scoreIssue, toGitHubLanguage, type ExperienceLevel, type SkillProfile } from '@/lib/matching';
import type { Issue } from '@/types';

interface Body {
  languages?: unknown;
  skills?: unknown; // legacy name for languages
  technologies?: unknown;
  interests?: unknown;
  experienceLevel?: unknown;
}

const LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];

function strings(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, max);
}

/** POST /api/issues/recommended — issues ranked against a skill profile. */
export async function POST(request: Request) {
  const body = await readJson<Body>(request);
  if (!body) return jsonError(400, 'invalid_body', 'Send a JSON body with languages, technologies and interests.');

  const skills: SkillProfile = {
    languages: strings(body.languages ?? body.skills),
    technologies: strings(body.technologies),
    interests: strings(body.interests),
    experienceLevel: LEVELS.includes(body.experienceLevel as ExperienceLevel)
      ? (body.experienceLevel as ExperienceLevel)
      : 'beginner',
  };

  // Only real GitHub languages can be used as language: qualifiers.
  const languages = Array.from(
    new Set(skills.languages.map(toGitHubLanguage).filter((value): value is string => Boolean(value)))
  ).slice(0, 3);

  if (languages.length === 0 && skills.technologies.length === 0) {
    return jsonError(400, 'no_skills', 'Add at least one programming language or technology.');
  }

  const preset = skills.experienceLevel === 'beginner' ? 'good-first' : skills.experienceLevel === 'intermediate' ? 'help-wanted' : 'unassigned';
  const searches: Array<{ q: string; language: string | null }> = languages.map(language => ({
    q: buildIssueQuery({ preset, language }),
    language,
  }));
  if (skills.technologies.length > 0) {
    const tech = skills.technologies.slice(0, 2).map(t => (/\s/.test(t) ? `"${t}"` : t)).join(' OR ');
    searches.push({ q: `${buildIssueQuery({ preset })} ${tech}`, language: null });
  }

  const settled = await Promise.allSettled(
    searches.map(search => searchIssues(search.q, { sort: 'updated', perPage: 20, revalidate: 600 }))
  );

  const firstError = settled.find((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
  const seen = new Set<number>();
  const ranked: Array<Issue & { matchScore: number; matchReasons: string[]; repoLanguage: string | null }> = [];

  settled.forEach((outcome, index) => {
    if (outcome.status !== 'fulfilled') return;
    for (const issue of outcome.value.items) {
      if (seen.has(issue.id)) continue;
      seen.add(issue.id);
      const repoLanguage = searches[index].language;
      const match = scoreIssue(issue, skills, repoLanguage);
      ranked.push({ ...issue, matchScore: match.score, matchReasons: match.reasons, repoLanguage });
    }
  });

  if (ranked.length === 0 && firstError) {
    const reason = firstError.reason;
    return errorResponse(reason instanceof GitHubError ? reason : new Error(String(reason)));
  }

  ranked.sort((a, b) => b.matchScore - a.matchScore || b.updated_at.localeCompare(a.updated_at));

  return NextResponse.json({
    items: ranked.slice(0, 30).map(issue => ({ ...issue, repository: { full_name: repoFullName(issue.repository_url) } })),
    total_count: ranked.length,
    languages,
    partial: Boolean(firstError),
  });
}
