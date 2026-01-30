import { NextRequest, NextResponse } from 'next/server';
import { calculateIssueMatchScore, ResumeSkills } from '@/lib/github';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skills, technologies, interests, experienceLevel } = body as ResumeSkills;

    if (!skills || !Array.isArray(skills)) {
      return NextResponse.json(
        { error: 'Invalid skills data provided' },
        { status: 400 }
      );
    }

    // Build search query based on skills
    const queryParts: string[] = ['is:issue', 'state:open', 'no:assignee'];
    
    // Add language filter based on top skills
    if (skills.length > 0) {
      // Pick top 3 languages for search
      const topSkills = skills.slice(0, 3);
      queryParts.push(`language:${topSkills.join(',')}`);
    }
    
    // Add experience-level appropriate labels
    if (experienceLevel === 'beginner') {
      queryParts.push('label:"good first issue"');
    } else if (experienceLevel === 'intermediate') {
      queryParts.push('label:"help wanted"');
    }
    // Advanced users get all issues

    const searchQuery = encodeURIComponent(queryParts.join(' '));
    const url = `${GITHUB_API_BASE}/search/issues?q=${searchQuery}&sort=created&order=desc&per_page=50`;

    const response = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return NextResponse.json(
        { error: `GitHub API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const issues = data.items || [];

    // Score each issue based on resume skills
    const resumeSkills: ResumeSkills = {
      skills,
      technologies: technologies || [],
      interests: interests || [],
      experienceLevel: experienceLevel || 'beginner',
    };

    // Extract repo language from repository_url for better matching
    const scoredIssues = await Promise.all(
      issues.map(async (issue: any) => {
        // Get repo info for language
        let repoLanguage: string | null = null;
        try {
          const repoUrl = issue.repository_url;
          const repoResponse = await fetch(repoUrl, {
            headers: getHeaders(),
            next: { revalidate: 3600 },
          });
          if (repoResponse.ok) {
            const repoData = await repoResponse.json();
            repoLanguage = repoData.language;
          }
        } catch {
          // Ignore repo fetch errors
        }

        const matchResult = calculateIssueMatchScore(issue, resumeSkills, repoLanguage);

        return {
          ...issue,
          matchScore: matchResult.score,
          matchReasons: matchResult.matchReasons,
          repoLanguage,
        };
      })
    );

    // Sort by match score (highest first)
    scoredIssues.sort((a, b) => b.matchScore - a.matchScore);

    // Return top 30 matches
    return NextResponse.json({
      items: scoredIssues.slice(0, 30),
      total_count: scoredIssues.length,
      query: queryParts.join(' '),
    });

  } catch (error) {
    console.error('Error fetching recommended issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
