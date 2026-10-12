import { describe, expect, it } from 'vitest';
import { EMPTY_SKILLS, hasSkills, scoreIssue, scoreRepository, toGitHubLanguage, type SkillProfile } from '@/lib/matching';
import type { Issue, Repository } from '@/types';

const skills: SkillProfile = {
  languages: ['typescript', 'Go'],
  technologies: ['React', 'Docker'],
  interests: ['web'],
  experienceLevel: 'beginner',
};

function issue(over: Partial<Issue> = {}): Issue {
  return {
    id: 1,
    number: 1,
    title: 'Fix React hydration warning in docs',
    body: null,
    html_url: 'https://github.com/a/b/issues/1',
    state: 'open',
    labels: [{ id: 1, name: 'good first issue', color: '7057ff', description: null }],
    comments: 0,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-02T00:00:00Z',
    user: { login: 'x', avatar_url: '', html_url: '' },
    repository_url: 'https://api.github.com/repos/a/b',
    ...over,
  };
}

function repo(over: Partial<Repository> = {}): Repository {
  return {
    id: 1,
    name: 'b',
    full_name: 'a/b',
    description: null,
    html_url: 'https://github.com/a/b',
    homepage: null,
    language: 'TypeScript',
    stargazers_count: 10,
    forks_count: 1,
    open_issues_count: 3,
    watchers_count: 1,
    topics: ['react', 'frontend'],
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    pushed_at: new Date().toISOString(),
    owner: { login: 'a', avatar_url: '', html_url: '' },
    license: null,
    ...over,
  };
}

describe('toGitHubLanguage', () => {
  it('normalizes common spellings to linguist names', () => {
    expect(toGitHubLanguage('typescript')).toBe('TypeScript');
    expect(toGitHubLanguage(' golang ')).toBe('Go');
    expect(toGitHubLanguage('c++')).toBe('C++');
    expect(toGitHubLanguage('csharp')).toBe('C#');
  });

  it('returns null for frameworks and unknown words', () => {
    expect(toGitHubLanguage('React')).toBeNull();
    expect(toGitHubLanguage('docker')).toBeNull();
  });
});

describe('scoreIssue', () => {
  it('rewards language, level, technology and interest matches with reasons', () => {
    const match = scoreIssue(issue(), skills, 'TypeScript');
    expect(match.score).toBeGreaterThanOrEqual(80);
    expect(match.reasons).toContain('TypeScript');
    expect(match.reasons).toContain('Beginner friendly');
  });

  it('scores an unrelated issue low', () => {
    const match = scoreIssue(issue({ title: 'Kernel scheduler regression', labels: [] }), skills, 'C');
    expect(match.score).toBe(0);
    expect(match.reasons).toEqual([]);
  });

  it('never exceeds 100', () => {
    expect(scoreIssue(issue(), skills, 'TypeScript').score).toBeLessThanOrEqual(100);
  });
});

describe('scoreRepository', () => {
  it('is null when the user has no skills', () => {
    expect(scoreRepository(repo(), EMPTY_SKILLS)).toBeNull();
    expect(hasSkills(EMPTY_SKILLS)).toBe(false);
  });

  it('matches language, topics and recent activity', () => {
    expect(scoreRepository(repo(), skills)).toBeGreaterThanOrEqual(70);
    expect(scoreRepository(repo({ language: 'Haskell', topics: [], pushed_at: '2020-01-01T00:00:00Z' }), skills)).toBe(0);
  });
});
