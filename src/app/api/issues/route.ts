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
  
  const labels = searchParams.get('labels')?.split(',').filter(Boolean) || ['good first issue'];
  const language = searchParams.get('language') || '';
  
  // Build the search query
  const queryParts: string[] = ['is:issue', 'state:open'];

  // Add labels
  labels.forEach((label) => {
    queryParts.push(`label:"${label}"`);
  });

  if (language) {
    queryParts.push(`language:${language}`);
  }

  const searchQuery = encodeURIComponent(queryParts.join(' '));
  const url = `${GITHUB_API_BASE}/search/issues?q=${searchQuery}&sort=created&order=desc&per_page=20`;

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
    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}
