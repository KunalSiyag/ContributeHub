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
          <h2>Welcome to Orion</h2>
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
         <div className={styles.emptyCard} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '60px 20px',
            textAlign: 'center',
            gap: '15px' 
         }}>
             <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🚧</div>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>My Issues Dashboard</h2>
             <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                We are building a powerful dashboard to track your contributions, saved issues, and payouts.
             </p>
             <span style={{ 
                padding: '8px 16px', 
                background: 'var(--color-bg-secondary)', 
                border: '1px solid var(--color-border)', 
                borderRadius: '20px', 
                fontSize: '0.85rem',
                color: 'var(--color-primary)',
                marginTop: '10px'
             }}>
                Coming Soon
             </span>
         </div>
      </div>
    </div>
  );
}
