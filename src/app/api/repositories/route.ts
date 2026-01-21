import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const query = searchParams.get('query') || '';
  const language = searchParams.get('language') || '';
  const minStars = parseInt(searchParams.get('minStars') || '0', 10);
  const topics = searchParams.get('topics')?.split(',').filter(Boolean) || [];
  
  // Build the search query
  const queryParts: string[] = [];

  if (query) {
    queryParts.push(query);
  }

  if (language) {
    queryParts.push(`language:${language}`);
  }

  if (minStars > 0) {
    queryParts.push(`stars:>=${minStars}`);
  }

  topics.forEach((topic) => {
    queryParts.push(`topic:${topic}`);
  });

  // Default: look for repos with help wanted issues
  if (queryParts.length === 0) {
    queryParts.push('help-wanted-issues:>0 stars:>=100');
  }

  const searchQuery = encodeURIComponent(queryParts.join(' '));
  const url = `${GITHUB_API_BASE}/search/repositories?q=${searchQuery}&sort=stars&order=desc&per_page=20`;

  try {
    const response = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}
