// Bounty API Integration
// Aggregates bounties from multiple sources

export interface BountyIssue {
  id: string;
  title: string;
  repo: string;
  url: string;
  bountyAmount: string;
  bountyValue: number; // numeric for sorting
  source: 'github' | 'gitcoin' | 'algora' | 'other';
  labels: string[];
  createdAt: string;
}

export type BountySource = 'all' | 'github' | 'gitcoin' | 'algora';

// Parse bounty amount from GitHub issue labels
function parseBountyFromLabels(labels: string[]): { amount: string; value: number } | null {
  for (const label of labels) {
    const lower = label.toLowerCase();
    
    // Match patterns like "$100", "bounty: $200", "💰 $500"
    const match = lower.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (match) {
      const value = parseFloat(match[1].replace(',', ''));
      return { amount: `$${match[1]}`, value };
    }
    
    // Match patterns like "100 USD", "50 USDC"
    const usdMatch = lower.match(/(\d+(?:,\d{3})*)\s*(?:usd|usdc|usdt)/);
    if (usdMatch) {
      const value = parseFloat(usdMatch[1].replace(',', ''));
      return { amount: `$${usdMatch[1]}`, value };
    }
  }
  return null;
}

// Fetch bounty issues from GitHub (issues with bounty labels)
export async function fetchGitHubBounties(limit: number = 20): Promise<BountyIssue[]> {
  const token = process.env.GITHUB_TOKEN;
  
  // Search for issues with bounty-related labels
  const query = encodeURIComponent('label:bounty,label:"💰",label:reward is:issue is:open');
  
  try {
    const response = await fetch(
      `https://api.github.com/search/issues?q=${query}&sort=created&order=desc&per_page=${limit}`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      console.error('GitHub bounty fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.items || []).map((issue: any) => {
      const labels = issue.labels.map((l: any) => l.name);
      const bounty = parseBountyFromLabels(labels);
      const repoUrl = issue.repository_url;
      const repoParts = repoUrl.split('/');
      const repo = `${repoParts[repoParts.length - 2]}/${repoParts[repoParts.length - 1]}`;

      return {
        id: `gh-${issue.id}`,
        title: issue.title,
        repo,
        url: issue.html_url,
        bountyAmount: bounty?.amount || 'Bounty',
        bountyValue: bounty?.value || 0,
        source: 'github' as const,
        labels,
        createdAt: issue.created_at,
      };
    });
  } catch (err) {
    console.error('Error fetching GitHub bounties:', err);
    return [];
  }
}

// Mock Gitcoin bounties (would integrate with Gitcoin API in production)
export async function fetchGitcoinBounties(limit: number = 10): Promise<BountyIssue[]> {
  // Gitcoin API integration would go here
  // For now, return sample data
  return [
    {
      id: 'gc-1',
      title: 'Implement ZK proof verification',
      repo: 'gitcoin/passport',
      url: 'https://gitcoin.co/issue/example-1',
      bountyAmount: '$500',
      bountyValue: 500,
      source: 'gitcoin',
      labels: ['solidity', 'zk-proofs'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'gc-2',
      title: 'Add ENS integration',
      repo: 'gitcoin/web',
      url: 'https://gitcoin.co/issue/example-2',
      bountyAmount: '$300',
      bountyValue: 300,
      source: 'gitcoin',
      labels: ['web3', 'ens'],
      createdAt: new Date().toISOString(),
    },
  ];
}

// Aggregate all bounty sources
export async function fetchAllBounties(
  source: BountySource = 'all',
  limit: number = 20
): Promise<BountyIssue[]> {
  const bounties: BountyIssue[] = [];

  if (source === 'all' || source === 'github') {
    const ghBounties = await fetchGitHubBounties(limit);
    bounties.push(...ghBounties);
  }

  // Gitcoin bounties removed as per request (fabricated data)

  // Sort by bounty value descending
  bounties.sort((a, b) => b.bountyValue - a.bountyValue);

  return bounties.slice(0, limit);
}
