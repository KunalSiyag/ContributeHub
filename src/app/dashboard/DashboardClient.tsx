'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useIssueManagement, TrackedIssue } from '@/hooks/useIssueManagement';
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
  const { getTrackedIssues, loading } = useIssueManagement();
  
  const [stats, setStats] = useState<Stats>({
    saved: 0,
    ongoing: 0,
    pr_submitted: 0,
    completed: 0,
    total: 0,
  });
  const [recentIssues, setRecentIssues] = useState<TrackedIssue[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      const allIssues = await getTrackedIssues();
      
      const newStats = {
        saved: allIssues.filter(i => i.status === 'saved').length,
        ongoing: allIssues.filter(i => i.status === 'ongoing').length,
        pr_submitted: allIssues.filter(i => i.status === 'pr_submitted').length,
        completed: allIssues.filter(i => i.status === 'completed').length,
        total: allIssues.length,
      };
      
      setStats(newStats);
      setRecentIssues(allIssues.slice(0, 5));
    };
    
    fetchData();
  }, [user, getTrackedIssues]);

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

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <Link href="/issues?status=saved" className={styles.statCard}>
          <span className={styles.statIcon}>⭐</span>
          <span className={styles.statValue}>{stats.saved}</span>
          <span className={styles.statLabel}>Saved</span>
        </Link>
        <Link href="/issues?status=ongoing" className={styles.statCard}>
          <span className={styles.statIcon}>🔧</span>
          <span className={styles.statValue}>{stats.ongoing}</span>
          <span className={styles.statLabel}>Working On</span>
        </Link>
        <Link href="/issues?status=pr_submitted" className={styles.statCard}>
          <span className={styles.statIcon}>🚀</span>
          <span className={styles.statValue}>{stats.pr_submitted}</span>
          <span className={styles.statLabel}>PRs Submitted</span>
        </Link>
        <Link href="/issues?status=completed" className={styles.statCard}>
          <span className={styles.statIcon}>✅</span>
          <span className={styles.statValue}>{stats.completed}</span>
          <span className={styles.statLabel}>Completed</span>
        </Link>
      </div>

      {/* Recent Issues */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recent Issues</h2>
          <Link href="/issues" className={styles.viewAll}>View All →</Link>
        </div>
        
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
          </div>
        ) : recentIssues.length === 0 ? (
          <div className={styles.emptyCard}>
            <p>No tracked issues yet.</p>
            <Link href="/discover" className={styles.discoverBtn}>
              Discover Issues →
            </Link>
          </div>
        ) : (
          <div className={styles.recentList}>
            {recentIssues.map(issue => (
              <div key={issue.id} className={styles.recentItem}>
                <div className={styles.recentStatus}>
                  {issue.status === 'saved' && '⭐'}
                  {issue.status === 'ongoing' && '🔧'}
                  {issue.status === 'pr_submitted' && '🚀'}
                  {issue.status === 'completed' && '✅'}
                </div>
                <div className={styles.recentContent}>
                  <a 
                    href={issue.issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.recentTitle}
                  >
                    {issue.title}
                  </a>
                  <span className={styles.recentRepo}>{issue.repo_full_name}</span>
                </div>
                {issue.has_bounty && (
                  <span className={styles.bountyBadge}>💰</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <Link href="/discover" className={styles.actionCard}>
            <span className={styles.actionIcon}>🔍</span>
            <span className={styles.actionLabel}>Discover Issues</span>
          </Link>
          <Link href="/bounties" className={styles.actionCard}>
            <span className={styles.actionIcon}>💰</span>
            <span className={styles.actionLabel}>Browse Bounties</span>
          </Link>
          <Link href="/events" className={styles.actionCard}>
            <span className={styles.actionIcon}>📅</span>
            <span className={styles.actionLabel}>View Events</span>
          </Link>
          <Link href="/issues" className={styles.actionCard}>
            <span className={styles.actionIcon}>📋</span>
            <span className={styles.actionLabel}>My Issues</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
