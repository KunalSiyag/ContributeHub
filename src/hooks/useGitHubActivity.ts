import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface GitHubActivityItem {
  id: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed' | 'merged';
  created_at: string;
  repository_url: string;
  pull_request?: {
    html_url: string;
  };
  labels: { name: string; color: string }[];
}

export function useGitHubActivity() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserActivity = useCallback(async () => {
    if (!profile?.username) return { prs: [], issues: [] };

    setLoading(true);
    setError(null);

    try {
      // Fetch User's PRs
      const prsResponse = await fetch(`https://api.github.com/search/issues?q=type:pr+author:${profile.username}+sort:updated-desc&per_page=10`);
      if (!prsResponse.ok) throw new Error('Failed to fetch PRs');
      const prsData = await prsResponse.json();

      // Fetch User's Issues (created by them)
      const issuesResponse = await fetch(`https://api.github.com/search/issues?q=type:issue+author:${profile.username}+sort:updated-desc&per_page=10`);
      if (!issuesResponse.ok) throw new Error('Failed to fetch Issues');
      const issuesData = await issuesResponse.json();

      const formatItem = (item: any) => {
        const repoName = item.repository_url.split('/').slice(-2).join('/');
        return {
          ...item,
          repo_full_name: repoName,
          state: item.pull_request && item.pull_request.merged_at ? 'merged' : item.state
        };
      };

      return {
        prs: (prsData.items || []).map(formatItem),
        issues: (issuesData.items || []).map(formatItem)
      };

    } catch (err) {
      console.error('GitHub Activity Fetch Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activity');
      return { prs: [], issues: [] };
    } finally {
      setLoading(false);
    }
  }, [profile?.username]);

  return {
    fetchUserActivity,
    loading,
    error
  };
}
