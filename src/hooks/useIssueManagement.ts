import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback } from 'react';

export type IssueStatus = 'saved' | 'ongoing' | 'pr_submitted' | 'completed';

export interface TrackedIssue {
  id: string;
  user_id: string;
  issue_url: string;
  issue_number: number;
  repo_full_name: string;
  title: string;
  description?: string;
  labels: string[];
  status: IssueStatus;
  has_bounty: boolean;
  bounty_amount?: string;
  bounty_source?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useIssueManagement() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save an issue to track
  const saveIssue = useCallback(async (issue: {
    url: string;
    number: number;
    repo: string;
    title: string;
    description?: string;
    labels?: string[];
    hasBounty?: boolean;
    bountyAmount?: string;
    bountySource?: string;
  }) => {
    if (!user) {
      setError('Must be logged in to save issues');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('tracked_issues')
        .upsert({
          user_id: user.id,
          issue_url: issue.url,
          issue_number: issue.number,
          repo_full_name: issue.repo,
          title: issue.title,
          description: issue.description,
          labels: issue.labels || [],
          status: 'saved',
          has_bounty: issue.hasBounty || false,
          bounty_amount: issue.bountyAmount,
          bounty_source: issue.bountySource,
        }, {
          onConflict: 'user_id,issue_url',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      // Log activity
      await supabase.from('user_activity').insert({
        user_id: user.id,
        action_type: 'issue_save',
        metadata: { issue_url: issue.url },
      });

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save issue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Update issue status
  const updateStatus = useCallback(async (issueId: string, status: IssueStatus) => {
    if (!user) {
      setError('Must be logged in');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('tracked_issues')
        .update({ status })
        .eq('id', issueId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      if (status === 'pr_submitted') {
        await supabase.from('user_activity').insert({
          user_id: user.id,
          action_type: 'pr_submit',
          metadata: { issue_id: issueId },
        });
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Get user's tracked issues
  const getTrackedIssues = useCallback(async (status?: IssueStatus) => {
    if (!user) return [];

    setLoading(true);
    try {
      let query = supabase
        .from('tracked_issues')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrackedIssue[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Remove tracked issue
  const removeIssue = useCallback(async (issueId: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tracked_issues')
        .delete()
        .eq('id', issueId)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove issue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Check if issue is tracked
  const isIssueTracked = useCallback(async (issueUrl: string) => {
    if (!user) return null;

    try {
      const { data } = await supabase
        .from('tracked_issues')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('issue_url', issueUrl)
        .single();

      return data;
    } catch {
      return null;
    }
  }, [user, supabase]);

  return {
    saveIssue,
    updateStatus,
    getTrackedIssues,
    removeIssue,
    isIssueTracked,
    loading,
    error,
  };
}
