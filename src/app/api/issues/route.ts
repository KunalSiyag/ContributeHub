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
  
  // Parse all filter parameters
  const labels = searchParams.get('labels')?.split(',').filter(Boolean) || [];
  const language = searchParams.get('language') || '';
  const query = searchParams.get('query') || '';
  const sort = searchParams.get('sort') || 'created'; // created, updated, comments
  const order = searchParams.get('order') || 'desc';
  const minStars = parseInt(searchParams.get('minStars') || '0', 10);
  const preset = searchParams.get('preset') || ''; // recent, good-first, help-wanted, top-repos
  const perPage = parseInt(searchParams.get('per_page') || '20', 10);
  
  // Build the search query - explicitly filter for issues only (not PRs)
  const queryParts: string[] = ['is:issue', 'state:open', 'no:assignee'];

  // Handle presets
  if (preset === 'good-first') {
    queryParts.push('label:"good first issue"');
  } else if (preset === 'help-wanted') {
    queryParts.push('label:"help wanted"');
  } else if (preset === 'recent') {
    // Recent issues - no special label, just sorted by created
  } else if (preset === 'top-repos') {
    // Issues from repos with > 1000 stars
    queryParts.push('stars:>1000');
  }

  // Add custom labels (if not using preset or in addition to preset)
  if (labels.length > 0 && !preset) {
    labels.forEach((label) => {
      queryParts.push(`label:"${label}"`);
    });
  }

  // Add language filter
  if (language) {
    queryParts.push(`language:${language}`);
  }

  // Add minimum stars filter
  if (minStars > 0) {
    queryParts.push(`stars:>=${minStars}`);
  }

  // Add text search query
  if (query) {
    queryParts.push(query);
  }

  const searchQuery = encodeURIComponent(queryParts.join(' '));
  const url = `${GITHUB_API_BASE}/search/issues?q=${searchQuery}&sort=${sort}&order=${order}&per_page=${perPage}`;

  try {
    const response = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return NextResponse.json(
        { error: `GitHub API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Filter out any items that are actually pull requests
    // GitHub's search API sometimes returns PRs even with is:issue
    // PRs have a 'pull_request' key in the response
    const filteredItems = data.items?.filter((item: any) => !item.pull_request) || [];
    
    return NextResponse.json({
      ...data,
      items: filteredItems,
      total_count: filteredItems.length,
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

