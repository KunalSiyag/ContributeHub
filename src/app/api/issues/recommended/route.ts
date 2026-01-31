import { NextRequest, NextResponse } from 'next/server';
import { Issue } from '@/types';

const GITHUB_API_BASE = 'https://api.github.com';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export interface ResumeSkills {
  skills: string[];
  technologies: string[];
  interests: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

// Calculate match score for an issue
function calculateScore(
  issue: any,
  resumeSkills: ResumeSkills,
  repoLanguage?: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const labels = issue.labels?.map((l: any) => l.name?.toLowerCase() || '') || [];
  const issueText = (issue.title + ' ' + labels.join(' ')).toLowerCase();
  
  // 1. Language match (35 points)
  if (repoLanguage) {
    const langMatch = resumeSkills.skills.find(
      skill => skill.toLowerCase() === repoLanguage.toLowerCase()
    );
    if (langMatch) {
      score += 35;
      reasons.push(`${repoLanguage} developer`);
    }
  }
  
  // 2. Experience level (25 points)
  const beginnerLabels = ['good first issue', 'beginner', 'easy', 'first-timers-only', 'starter', 'good-first-issue'];
  const intermediateLabels = ['help wanted', 'medium', 'intermediate', 'help-wanted'];
  
  const hasBeginnerLabel = labels.some((l: string) => beginnerLabels.some(bl => l.includes(bl)));
  const hasIntermediateLabel = labels.some((l: string) => intermediateLabels.some(il => l.includes(il)));
  
  if (resumeSkills.experienceLevel === 'beginner' && hasBeginnerLabel) {
    score += 25;
    reasons.push('Good first issue');
  } else if (resumeSkills.experienceLevel === 'intermediate' && (hasIntermediateLabel || hasBeginnerLabel)) {
    score += 20;
    reasons.push('Help wanted');
  } else if (resumeSkills.experienceLevel === 'advanced') {
    score += 15;
  }
  
  // 3. Technology match (25 points)
  const techMatches = resumeSkills.technologies.filter(tech =>
    issueText.includes(tech.toLowerCase())
  );
  if (techMatches.length > 0) {
    score += Math.min(techMatches.length * 12, 25);
    reasons.push(techMatches[0]);
  }
  
  // 4. Interest match (15 points)
  const interestKeywords: Record<string, string[]> = {
    'web': ['frontend', 'ui', 'css', 'html', 'react', 'vue', 'angular'],
    'backend': ['api', 'server', 'database', 'graphql', 'rest'],
    'mobile': ['android', 'ios', 'mobile', 'react-native', 'flutter'],
    'devops': ['docker', 'ci', 'cd', 'deploy', 'kubernetes', 'aws'],
    'ml': ['ml', 'ai', 'model', 'training', 'tensorflow', 'pytorch'],
    'docs': ['docs', 'documentation', 'readme', 'guide'],
  };
  
  for (const interest of resumeSkills.interests) {
    const keywords = interestKeywords[interest] || [interest];
    if (keywords.some(kw => issueText.includes(kw))) {
      score += 15;
      reasons.push(interest);
      break;
    }
  }
  
  return { score, reasons };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skills, technologies, interests, experienceLevel } = body as ResumeSkills;

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one skill' },
        { status: 400 }
      );
    }

    const resumeSkills: ResumeSkills = {
      skills: skills || [],
      technologies: technologies || [],
      interests: interests || [],
      experienceLevel: experienceLevel || 'beginner',
    };

    // Build multiple queries for better results
    const allIssues: any[] = [];
    const seenIds = new Set<number>();
    
    // Query for each top skill (up to 3)
    const topSkills = skills.slice(0, 3);
    
    for (const skill of topSkills) {
      const queryParts = ['is:issue', 'state:open', 'no:assignee'];
      queryParts.push(`language:${skill}`);
      
      // Add experience-based labels
      if (experienceLevel === 'beginner') {
        queryParts.push('label:"good first issue"');
      } else if (experienceLevel === 'intermediate') {
        queryParts.push('label:"help wanted"');
      }
      
      const searchQuery = encodeURIComponent(queryParts.join(' '));
      const url = `${GITHUB_API_BASE}/search/issues?q=${searchQuery}&sort=updated&order=desc&per_page=20`;

      try {
        const response = await fetch(url, {
          headers: getHeaders(),
          next: { revalidate: 300 },
        });

        if (response.ok) {
          const data = await response.json();
          for (const issue of data.items || []) {
            if (!seenIds.has(issue.id)) {
              seenIds.add(issue.id);
              // Extract language from repository_url path
              const repoPath = issue.repository_url?.split('/repos/')?.[1] || '';
              allIssues.push({ ...issue, _repoPath: repoPath, _queryLang: skill });
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching issues for ${skill}:`, err);
      }
    }

    // Also do a general search based on technologies
    if (technologies.length > 0) {
      const techQuery = technologies.slice(0, 2).join(' OR ');
      const generalParts = ['is:issue', 'state:open', 'no:assignee', techQuery];
      
      if (experienceLevel === 'beginner') {
        generalParts.push('label:"good first issue"');
      }
      
      const searchQuery = encodeURIComponent(generalParts.join(' '));
      const url = `${GITHUB_API_BASE}/search/issues?q=${searchQuery}&sort=updated&order=desc&per_page=15`;
      
      try {
        const response = await fetch(url, { headers: getHeaders() });
        if (response.ok) {
          const data = await response.json();
          for (const issue of data.items || []) {
            if (!seenIds.has(issue.id)) {
              seenIds.add(issue.id);
              allIssues.push({ ...issue, _repoPath: '', _queryLang: '' });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching tech-based issues:', err);
      }
    }

    if (allIssues.length === 0) {
      return NextResponse.json({
        items: [],
        total_count: 0,
        message: 'No matching issues found. Try adjusting your skills.',
      });
    }

    // Score and sort issues
    const scoredIssues = allIssues.map(issue => {
      const repoLanguage = issue._queryLang || null;
      const { score, reasons } = calculateScore(issue, resumeSkills, repoLanguage);
      
      // Clean up the issue object
      const { _repoPath, _queryLang, ...cleanIssue } = issue;
      
      return {
        ...cleanIssue,
        matchScore: score,
        matchReasons: reasons,
        repoLanguage,
      };
    });

    // Sort by score (highest first)
    scoredIssues.sort((a, b) => b.matchScore - a.matchScore);

    // Return top 25 matches
    return NextResponse.json({
      items: scoredIssues.slice(0, 25),
      total_count: scoredIssues.length,
    });

  } catch (error) {
    console.error('Error fetching recommended issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations. Please try again.' },
      { status: 500 }
    );
  }
}
