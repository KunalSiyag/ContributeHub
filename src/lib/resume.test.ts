import { describe, expect, it } from 'vitest';
import { extractSkillsFast, mergeAnalysisResults } from '@/lib/resume';

const RESUME = `Software engineer, 3 years of experience.
Built services in Go and TypeScript with React and Docker on AWS.
I like to go hiking in spring and express ideas clearly.`;

describe('extractSkillsFast', () => {
  it('finds languages and tools', () => {
    const result = extractSkillsFast(RESUME);
    expect(result.skills).toEqual(expect.arrayContaining(['TypeScript']));
    expect(result.skills.some(s => s.toLowerCase() === 'go')).toBe(true);
    expect(result.technologies).toEqual(expect.arrayContaining(['React', 'Docker', 'AWS']));
  });

  it('ignores everyday words that share a name with a tool', () => {
    const result = extractSkillsFast('I go to the gym in spring and express myself. Junior developer, 1 year of experience, Python.');
    expect(result.skills.some(s => s.toLowerCase() === 'go')).toBe(false);
    expect(result.technologies.map(t => t.toLowerCase())).not.toContain('spring');
    expect(result.technologies.map(t => t.toLowerCase())).not.toContain('express');
  });
});

describe('mergeAnalysisResults', () => {
  it('returns the fast result unchanged when AI produced nothing', () => {
    const fast = extractSkillsFast(RESUME);
    expect(mergeAnalysisResults(fast, null)).toBe(fast);
    expect(mergeAnalysisResults(fast, { skills: [], technologies: [] }).source).toBe('fast');
  });

  it('marks hybrid results when AI added skills', () => {
    const fast = extractSkillsFast(RESUME);
    const merged = mergeAnalysisResults(fast, { skills: ['Rust'], technologies: ['Kubernetes'] });
    expect(merged.source).toBe('hybrid');
    expect(merged.skills).toContain('Rust');
  });
});
