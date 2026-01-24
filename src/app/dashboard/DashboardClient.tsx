'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useIssueManagement, TrackedIssue } from '@/hooks/useIssueManagement';
import { useGitHubActivity } from '@/hooks/useGitHubActivity';
import styles from './page.module.css';

interface Stats {
  saved: number;
  ongoing: number;
  pr_submitted: number;
  completed: number;
  total: number;
}

export default function DashboardClient() {
  const { user, profile, loading: authLoading } = useAuth();
  const { getTrackedIssues, loading: dbLoading } = useIssueManagement();
  const { fetchUserActivity, loading: ghLoading } = useGitHubActivity();
  
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'saved' | 'ongoing' | 'pr_submitted' | 'completed'>('all'); // Filter state
  const [stats, setStats] = useState<Stats>({
    saved: 0,
    ongoing: 0,
    pr_submitted: 0,
    completed: 0,
    total: 0,
  });
  const [savedIssues, setSavedIssues] = useState<TrackedIssue[]>([]);
  const [githubActivity, setGithubActivity] = useState<{ prs: any[], issues: any[] }>({ prs: [], issues: [] });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Fetch Saved Issues
      const allIssues = await getTrackedIssues();
      setSavedIssues(allIssues || []);
      
      const newStats = {
        saved: allIssues.filter(i => i.status === 'saved').length,
        ongoing: allIssues.filter(i => i.status === 'ongoing').length,
        pr_submitted: allIssues.filter(i => i.status === 'pr_submitted').length,
        completed: allIssues.filter(i => i.status === 'completed').length,
        total: allIssues.length,
      };
      setStats(newStats);

      // Fetch GitHub Activity
      if (profile?.username) {
        const activity = await fetchUserActivity();
        setGithubActivity(activity);
      }
    };
    
    fetchData();
  }, [user, profile, getTrackedIssues, fetchUserActivity]);

  const isLoading = authLoading || dbLoading || ghLoading;

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
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Welcome to ContributeHub</h2>
          <p>Sign in with GitHub to track your open source contributions and manage issues.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.welcomeSection}>
          {profile?.avatar_url && (
            <img 
              src={profile.avatar_url} 
              alt={profile.username || 'User'} 
              className={styles.avatar}
            />
          )}
          <div>
            <h1>Welcome back, {profile?.username || 'Contributor'}!</h1>
            <p className={styles.subtitle}>Here is your contribution overview</p>
          </div>
        </div>
        
        

      </header>
      
      {/* Issues List Content */}
      <div className={styles.issuesTab}>
        <div className={styles.sectionHeader} style={{ marginBottom: '20px', flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <h2>All Tracked Issues</h2>
              <Link href="/discover" className={styles.discoverBtn}>
                  Find New Issues +
              </Link>
            </div>
            
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['all', 'saved', 'ongoing', 'pr_submitted', 'completed'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    border: '1px solid var(--color-border)',
                    background: filterStatus === status ? 'var(--color-primary)' : 'transparent',
                    color: filterStatus === status ? 'white' : 'var(--color-text-secondary)',
                    fontSize: '0.85rem',
                    textTransform: 'capitalize',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
        </div>
        
        {savedIssues
          .filter(i => filterStatus === 'all' || i.status === filterStatus)
          .length === 0 ? (
            <div className={styles.emptyCard}>
              <p>No issues found for this filter.</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {savedIssues
                .filter(i => filterStatus === 'all' || i.status === filterStatus)
                .map(issue => (
                  <div key={issue.id} style={{ 
                    background: 'var(--color-bg-card)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: '16px', 
                    padding: '20px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: issue.status === 'completed' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                          color: issue.status === 'completed' ? 'white' : 'var(--color-text-secondary)',
                          textTransform: 'capitalize'
                      }}>
                          {issue.status.replace('_', ' ')}
                      </span>
                      {issue.has_bounty && <span>💰</span>}
                    </div>
                    
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {issue.title}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{issue.repo_full_name}</p>
                    
                    <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px' }}>
                        <a href={issue.issue_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 500 }}>
                          View on GitHub
                        </a>
                    </div>
                  </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}
