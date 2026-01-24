'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useIssueManagement, TrackedIssue } from '@/hooks/useIssueManagement';
import { useGitHubActivity } from '@/hooks/useGitHubActivity';
import IssueActions from '@/components/IssueActions';
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
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'saved' | 'ongoing' | 'pr_submitted' | 'completed' | 'resume_based'>('all');
  const [savedIssues, setSavedIssues] = useState<TrackedIssue[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (user && !authLoading) {
        // Fetch Saved Issues
        const allIssues = await getTrackedIssues();
        console.log('DashboardClient: fetched issues', allIssues);
        setSavedIssues(allIssues || []);
      }
    };
    fetchData();
  }, [user, authLoading, getTrackedIssues]);

  const handleStatusUpdate = (issueId: string, newStatus: TrackedIssue['status'] | null) => {
    if (!newStatus) {
        // Removed
        setSavedIssues(prev => prev.filter(i => i.id !== issueId));
    } else {
        // Updated
        setSavedIssues(prevIssues =>
          prevIssues.map(issue =>
            issue.id === issueId ? { ...issue, status: newStatus } : issue
          )
        );
    }
  };

  const isComingSoonTab = ['ongoing', 'pr_submitted', 'completed', 'resume_based'].includes(filterStatus);

  if (authLoading || dbLoading) {
    return <div className={styles.loadingContainer}>Loading dashboard...</div>;
  }

  if (!user) {
    return (
      <div className={styles.loadingContainer}>
        <p>Please log in to view your dashboard.</p>
        <Link href="/login" className={styles.discoverBtn}>Go to Login</Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {/* ... (keep header content) ... */}
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
                  {status.replace('_', ' ').replace('resume based', 'Resume Based')}
                </button>
              ))}
            </div>
        </div>
        
        {isComingSoonTab ? (
           <div className={styles.emptyCard} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '60px 20px',
              textAlign: 'center',
              gap: '15px',
              minHeight: '300px'
           }}>
               <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🚧</div>
               <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Coming Soon</h2>
               <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                  We are working hard to bring you {filterStatus.replace('_', ' ')} features!
               </p>
               {filterStatus === 'resume_based' && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)' }}>
                      AI-powered resume analysis to find perfect issues for you.
                  </p>
               )}
           </div>
        ) : (
            savedIssues
              .filter(i => filterStatus === 'all' || i.status === filterStatus)
              .length === 0 ? (
                <div className={styles.emptyCard}>
                  <p>No issues found for this filter.</p>
                  {filterStatus === 'all' && (
                    <Link href="/discover" style={{ marginTop: '10px', display: 'inline-block', color: 'var(--color-primary)' }}>
                      Go discover some issues →
                    </Link>
                  )}
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
                        gap: '15px'
                      }}>
                        {/* ... (Keep existing card content) ... */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, flex: 1, paddingRight: '10px' }}>
                              <a href={issue.issue_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                 {issue.title}
                              </a>
                          </h3>
                          {issue.has_bounty && <span title="Bounty Available">💰</span>}
                        </div>
                        
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0 }}>{issue.repo_full_name}</p>
                        
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {issue.labels?.slice(0, 3).map((label: string, idx: number) => (
                                <span key={idx} style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', color: 'var(--color-text-secondary)' }}>
                                    {label}
                                </span>
                            ))}
                        </div>
    
                        <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                               #{issue.issue_number}
                            </span>
                            
                            <div style={{ transform: 'scale(0.9)', transformOrigin: 'right center' }}>
                                <IssueActions 
                                    issue={{
                                        url: issue.issue_url,
                                        number: issue.issue_number,
                                        repo: issue.repo_full_name,
                                        title: issue.title,
                                        labels: issue.labels,
                                        hasBounty: issue.has_bounty
                                    }}
                                    initialStatus={issue.status as any}
                                    onStatusChange={(newStatus) => handleStatusUpdate(issue.id, newStatus)}
                                />
                            </div>
                        </div>
                      </div>
                  ))}
                </div>
            )
        )}
      </div>
    </div>
  );
}
