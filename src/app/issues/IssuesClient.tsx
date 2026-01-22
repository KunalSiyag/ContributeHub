'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useIssueManagement, TrackedIssue, IssueStatus } from '@/hooks/useIssueManagement';
import styles from './page.module.css';

const STATUS_TABS: { value: IssueStatus | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All Issues', icon: '📋' },
  { value: 'saved', label: 'Saved', icon: '⭐' },
  { value: 'ongoing', label: 'Working On', icon: '🔧' },
  { value: 'pr_submitted', label: 'PR Submitted', icon: '🚀' },
  { value: 'completed', label: 'Completed', icon: '✅' },
];

export default function IssuesClient() {
  const { user, loading: authLoading } = useAuth();
  const { getTrackedIssues, updateStatus, removeIssue, loading } = useIssueManagement();
  const searchParams = useSearchParams();
  
  const [issues, setIssues] = useState<TrackedIssue[]>([]);
  const [activeTab, setActiveTab] = useState<IssueStatus | 'all'>('all');

  // Get initial tab from URL
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && STATUS_TABS.some(t => t.value === statusParam)) {
      setActiveTab(statusParam as IssueStatus | 'all');
    }
  }, [searchParams]);

  // Fetch issues when tab changes
  useEffect(() => {
    const fetchIssues = async () => {
      if (!user) return;
      const status = activeTab === 'all' ? undefined : activeTab;
      const data = await getTrackedIssues(status);
      setIssues(data);
    };
    fetchIssues();
  }, [user, activeTab, getTrackedIssues]);

  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    const success = await updateStatus(issueId, newStatus);
    if (success) {
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      ));
    }
  };

  const handleRemove = async (issueId: string) => {
    const success = await removeIssue(issueId);
    if (success) {
      setIssues(prev => prev.filter(issue => issue.id !== issueId));
    }
  };

  if (authLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.emptyState}>
        <h2>Sign in to track issues</h2>
        <p>Login with GitHub to save and manage open source issues youre working on.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>My Issues</h1>
        <p className={styles.subtitle}>Track your open source contributions</p>
      </header>

      {/* Status Tabs */}
      <div className={styles.tabs}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            className={`${styles.tab} ${activeTab === tab.value ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.value)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {activeTab === tab.value && (
              <span className={styles.count}>
                {issues.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Issues List */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      ) : issues.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No issues found</h3>
          <p>
            {activeTab === 'all' 
              ? 'Start by exploring issues on the Discover page!'
              : `You dont have any ${activeTab.replace('_', ' ')} issues yet.`}
          </p>
        </div>
      ) : (
        <div className={styles.issuesList}>
          {issues.map(issue => (
            <div key={issue.id} className={styles.issueCard}>
              <div className={styles.issueHeader}>
                <a 
                  href={issue.issue_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.issueTitle}
                >
                  {issue.title}
                </a>
                {issue.has_bounty && (
                  <span className={styles.bountyBadge}>
                    💰 {issue.bounty_amount || 'Bounty'}
                  </span>
                )}
              </div>
              
              <div className={styles.issueMeta}>
                <span className={styles.repo}>{issue.repo_full_name}</span>
                <span className={styles.issueNum}>#{issue.issue_number}</span>
              </div>

              {issue.labels.length > 0 && (
                <div className={styles.labels}>
                  {issue.labels.slice(0, 3).map(label => (
                    <span key={label} className={styles.label}>{label}</span>
                  ))}
                  {issue.labels.length > 3 && (
                    <span className={styles.moreLabels}>+{issue.labels.length - 3}</span>
                  )}
                </div>
              )}

              <div className={styles.issueActions}>
                <select
                  className={styles.statusSelect}
                  value={issue.status}
                  onChange={(e) => handleStatusChange(issue.id, e.target.value as IssueStatus)}
                >
                  <option value="saved">⭐ Saved</option>
                  <option value="ongoing">🔧 Working On</option>
                  <option value="pr_submitted">🚀 PR Submitted</option>
                  <option value="completed">✅ Completed</option>
                </select>
                <button 
                  className={styles.removeBtn}
                  onClick={() => handleRemove(issue.id)}
                  title="Remove issue"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
