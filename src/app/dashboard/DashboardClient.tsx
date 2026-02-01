'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useIssueManagement, TrackedIssue } from '@/hooks/useIssueManagement';
import { useGitHubActivity } from '@/hooks/useGitHubActivity';
import IssueActions from '@/components/IssueActions';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
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
  const { fetchUserActivity, loading: activityLoading } = useGitHubActivity();
  
  const [filterStatus, setFilterStatus] = useState<'saved' | 'ongoing' | 'pr_submitted' | 'completed' | 'resume_based'>('saved');
  const [savedIssues, setSavedIssues] = useState<TrackedIssue[]>([]);
  const [githubData, setGithubData] = useState<{prs: any[], issues: any[]}>({prs: [], issues: []});
  const [initialLoading, setInitialLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.issue-card',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
    );
  }, { scope: containerRef, dependencies: [filterStatus] });

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 500
      ) {
        setVisibleCount((prev) => prev + 12);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      
      if (user) {
        try {
          // Fetch Saved Issues
          const allIssues = await getTrackedIssues();
          setSavedIssues(allIssues || []);
          
          // Fetch Live Activity if profile exists
          if (profile?.username) {
             const activity = await fetchUserActivity();
             setGithubData(activity);
          }
        } finally {
          setInitialLoading(false);
        }
      } else {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, [user, profile, authLoading, getTrackedIssues, fetchUserActivity]);

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

  const isComingSoonTab = ['resume_based'].includes(filterStatus);

  // Determine which issues to show
  let displayIssues: any[] = [];
  let isLiveGitHubData = false;

  if (filterStatus === 'pr_submitted') {
    displayIssues = githubData.prs.filter(pr => pr.state === 'open');
    isLiveGitHubData = true;
  } else if (filterStatus === 'ongoing') {
    displayIssues = githubData.issues.filter(i => i.state === 'open');
    isLiveGitHubData = true;
  } else if (filterStatus === 'completed') {
    const closedPrs = githubData.prs.filter(pr => pr.state === 'merged' || pr.state === 'closed');
    const closedIssues = githubData.issues.filter(i => i.state === 'closed');
    const dbCompleted = savedIssues.filter(i => i.status === 'completed');
    displayIssues = [...closedPrs, ...closedIssues, ...dbCompleted];
  } else {
    displayIssues = savedIssues.filter(i => i.status === 'saved');
  }

  if (authLoading || (initialLoading && user)) {
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

        {/* Contribution Graph (Desktop) */}
        <div className={styles.desktopOnly}>
        {profile?.username && (
          <div style={{ marginTop: '25px', padding: '20px', background: 'var(--color-bg-secondary)', borderRadius: '16px', border: '1px solid var(--color-border)', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
               <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Contribution Activity</h3>
               <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>Last 365 Days</span>
            </div>
            <img 
              src={`https://ghchart.rshah.org/22c55e/${profile.username}`} 
              alt="Contribution Graph" 
              style={{ width: '100%', minWidth: '700px', display: 'block', height: 'auto' }}
            />
          </div>
        )}
        </div>

        {/* Stats Menu (Mobile) */}
        <div className={styles.mobileOnly}>
            <div className={styles.mobileStatsGrid}>
                <div className={styles.mobileStatCard}>
                    <div className={styles.mobileStatValue}>{savedIssues.filter(i => i.status === 'saved').length}</div>
                    <div className={styles.mobileStatLabel}>Saved</div>
                </div>
                <div className={styles.mobileStatCard}>
                    <div className={styles.mobileStatValue}>{
                        // Approximate ongoing (user issues + tracked ongoing)
                        savedIssues.filter(i => i.status === 'ongoing').length + (githubData.issues?.filter((i: any) => i.state === 'open').length || 0)
                    }</div>
                    <div className={styles.mobileStatLabel}>Ongoing</div>
                </div>
                 <div className={styles.mobileStatCard}>
                    <div className={styles.mobileStatValue}>{githubData.prs?.filter((p: any) => p.state === 'open').length || 0}</div>
                    <div className={styles.mobileStatLabel}>Open PRs</div>
                </div>
                 <div className={styles.mobileStatCard}>
                    <div className={styles.mobileStatValue}>{
                        savedIssues.filter(i => i.status === 'completed').length + 
                        (githubData.issues?.filter((i: any) => i.state === 'closed').length || 0) +
                        (githubData.prs?.filter((p: any) => p.state === 'merged').length || 0)
                    }</div>
                    <div className={styles.mobileStatLabel}>Completed</div>
                </div>
            </div>
        </div>
      </header>
      
      {/* Issues List Content */}
      <div className={styles.issuesTab}>
        <div className={styles.sectionHeader} style={{ marginBottom: '20px', flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                {filterStatus === 'pr_submitted' ? 'My Open PRs (Live)' : 
                 filterStatus === 'ongoing' ? 'My Issues (Live)' : 
                 filterStatus === 'completed' ? 'Completed & Closed' :
                 'Saved Issues'}
              </h2>
              <Link href="/discover" className={styles.discoverBtn}>
                  Find New Issues +
              </Link>
            </div>
            
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['saved', 'ongoing', 'pr_submitted', 'completed', 'resume_based'].map(status => (
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
                  {status === 'resume_based' ? '📄 Resume Based' : status.replace('_', ' ')}
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
               <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📄</div>
               <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Resume-Based Recommendations</h2>
               <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                  Upload your resume and get personalized issue recommendations matched to your skills.
               </p>
               <Link 
                 href="/resume" 
                 style={{ 
                   marginTop: '10px', 
                   padding: '12px 24px', 
                   background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent-purple))', 
                   borderRadius: '12px', 
                   color: 'white', 
                   textDecoration: 'none', 
                   fontWeight: 600,
                   transition: 'transform 0.2s, box-shadow 0.2s'
                 }}
               >
                 Upload Resume →
               </Link>
           </div>
        ) : (
            displayIssues.length === 0 ? (
                <div className={styles.emptyCard}>
                  <p>
                    {isLiveGitHubData 
                      ? `No ${filterStatus === 'pr_submitted' ? 'merged/open PRs' : 'issues'} found on your GitHub.` 
                      : 'No issues found for this filter.'}
                  </p>
                  {!isLiveGitHubData && filterStatus === 'saved' && (
                    <Link href="/discover" style={{ marginTop: '10px', display: 'inline-block', color: 'var(--color-primary)' }}>
                      Go discover some issues →
                    </Link>
                  )}
                </div>
            ) : (
                <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {Object.entries(
                    displayIssues.slice(0, visibleCount).reduce((acc, issue) => {
                      let groupKey = '';
                      if (filterStatus === 'completed') {
                          // Group by Status Category
                          if (issue.state === 'merged') groupKey = '💜 Merged PRs';
                          else if (issue.state === 'closed') {
                               if (issue.pull_request) groupKey = '❌ Closed PRs (Not Merged)';
                               else groupKey = '✅ Completed Issues';
                          }
                          else if (issue.status === 'completed') groupKey = '✅ Manually Completed';
                          else groupKey = '📁 Archived';
                      } else {
                          // Flat List for others
                          groupKey = 'all';
                      }
                      
                      if (!acc[groupKey]) acc[groupKey] = [];
                      acc[groupKey].push(issue);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([groupTitle, issues]) => (
                    <div key={groupTitle} className="repo-group">
                      {groupTitle !== 'all' && (
                          <h3 className={styles.repoGroupHeader}>
                             <span style={{ opacity: 0.7 }}></span> {groupTitle}
                             <span style={{ fontSize: '0.8rem', background: 'var(--color-bg-tertiary)', padding: '2px 8px', borderRadius: '12px' }}>{(issues as any[]).length}</span>
                          </h3>
                      )}
                      
                      <div className={styles.issuesGrid}>
                        {(issues as any[]).map((issue: any) => {
                            // Normalize data between DB and GitHub API
                            const issueId = issue.id; // DB ID or GitHub ID
                            const issueUrl = issue.issue_url || issue.html_url;
                            const issueNumber = issue.issue_number || issue.number;
                            const issueTitle = issue.title;
                            const currentRepoName = issue.repo_full_name || ((issue.repository_url || '').split('/').slice(-2).join('/')) || 'Unknown';
                            
                            // Normalize labels
                            const labels = Array.isArray(issue.labels) 
                              ? issue.labels.map((l: any) => typeof l === 'string' ? l : l.name) 
                              : [];

                            const isGitHubItem = !!issue.state;

                            // Status Badge Logic
                            const state = issue.state || (issue.status === 'completed' ? 'completed' : 'open');
                            let statusColor = '#22c55e'; // Green (Open)
                            if (state === 'closed') statusColor = '#ef4444'; // Red
                            if (state === 'merged') statusColor = '#a855f7'; // Purple
                            if (state === 'completed') statusColor = '#22c55e'; // Green check

                            return (
                            <div key={issueId} className={`${styles.issueCard} issue-card`} style={{ 
                              zIndex: openMenuId === issueId ? 100 : 1
                            }}>
                              {/* Status Badge for Live Data or Completed */}
                              {(isLiveGitHubData || filterStatus === 'completed') && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                    <span style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px', 
                                        background: `${statusColor}15`, // 15 = ~8% opacity
                                        color: statusColor,
                                        border: `1px solid ${statusColor}40`,
                                        textTransform: 'capitalize'
                                    }}>
                                        {state}
                                    </span>
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: (isLiveGitHubData || filterStatus === 'completed') ? '60px' : '0' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, flex: 1, paddingRight: '10px' }}>
                                    <a href={issueUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                      {issueTitle}
                                    </a>
                                </h3>
                                {!isLiveGitHubData && filterStatus !== 'completed' && issue.has_bounty && <span title="Bounty Available">💰</span>}
                              </div>
                              
                              {/* Show Repo Name Always (as requested) */}
                              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: '0 0 5px 0' }}>{currentRepoName}</p>
                              
                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                                  {labels.slice(0, 3).map((label: string, idx: number) => (
                                      <span key={idx} style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', color: 'var(--color-text-secondary)' }}>
                                          {label}
                                      </span>
                                  ))}
                              </div>
          
                              <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                                    #{issueNumber}
                                  </span>
                                  
                                  <div style={{ transform: 'scale(0.9)', transformOrigin: 'right center' }}>
                                      <IssueActions 
                                          issue={{
                                              url: issueUrl,
                                              number: issueNumber,
                                              repo: currentRepoName,
                                              title: issueTitle,
                                              labels: labels,
                                              hasBounty: issue.has_bounty
                                          }}
                                          initialStatus={filterStatus === 'completed' ? undefined : issue.status as any}
                                          onStatusChange={(newStatus) => !isGitHubItem && filterStatus !== 'completed' && handleStatusUpdate(issueId, newStatus)}
                                          isOpen={openMenuId === issueId}
                                          onToggleMenu={(isOpen) => setOpenMenuId(isOpen ? issueId : null)}
                                      />
                                  </div>
                              </div>
                            </div>
                        );})}
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
