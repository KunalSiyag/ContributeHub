'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Repository, Issue, ContributionEvent } from '@/types';
import IssueCard from './IssueCard';
import EventCard from './EventCard';
import styles from '../app/page.module.css';

gsap.registerPlugin(useGSAP);

// Types for props
interface PlatformStats {
  totalUsers: number;
  totalIssues: number;
  totalPRs: number;
  totalBounties: number;
}

interface Contributor {
  id: string;
  username: string;
  avatar_url: string;
  contribution_count: number;
}

interface HomeClientProps {
  trendingRepos: Repository[];
  beginnerIssues: Issue[];
  events: ContributionEvent[];
  stats: PlatformStats;
  activeContributors: Contributor[];
  bountyIssues: Issue[];
}

export default function HomeClient({ 
  trendingRepos, 
  beginnerIssues, 
  events,
  stats,
  activeContributors,
  bountyIssues,
}: HomeClientProps) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from(`.${styles.heroTitle}`, {
      y: 50,
      opacity: 0,
      duration: 0.8,
    })
    .from(`.${styles.heroSubtitle}`, {
      y: 20,
      opacity: 0,
      duration: 0.6,
    }, '-=0.4')
    .from(`.${styles.heroCta} > *`, {
      y: 20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
    }, '-=0.3');

  }, { scope: container });

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K+`;
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num}`;
  };

  return (
    <div ref={container} className={styles.homePage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Your Open Source<br />
            <span className={styles.gradientText}>Contribution Hub</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Discover projects, track contributions, join GSoC, GSSoC, Hacktoberfest and more.
            Find bounty issues and connect with the open source community.
          </p>
          <div className={styles.heroCta}>
            <Link href="/discover" className={styles.primaryBtn}>
              Explore Projects
            </Link>
            <Link href="/bounties" className={styles.secondaryBtn}>
              View Bounties
            </Link>
          </div>
          
          {/* Real Stats */}
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{formatNumber(stats.totalUsers || 0)}</span>
              <span className={styles.statLabel}>Contributors</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{formatNumber(stats.totalIssues || 0)}</span>
              <span className={styles.statLabel}>Issues Tracked</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{formatNumber(stats.totalPRs || 0)}</span>
              <span className={styles.statLabel}>PRs Submitted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why ContributeHub?</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>🔍</span>
            <h3>Discover</h3>
            <p>Find open source projects matching your skills and interests</p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>📊</span>
            <h3>Track</h3>
            <p>Manage your PRs, issues, and contributions in one dashboard</p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>💰</span>
            <h3>Earn</h3>
            <p>Find bounty issues and get paid for your contributions</p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>🎉</span>
            <h3>Events</h3>
            <p>Join GSoC, GSSoC, Hacktoberfest and other programs</p>
          </div>
        </div>
      </section>

      {/* Bounty Issues Section - Real Data */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>💰 Bounty Issues</h2>
          <Link href="/bounties" className={styles.viewAllLink}>View all →</Link>
        </div>
        {bountyIssues.length > 0 ? (
          <div className={styles.bountyGrid}>
            {bountyIssues.slice(0, 3).map(issue => {
              const repoMatch = issue.repository_url?.match(/repos\/(.+)/);
              const repoName = repoMatch ? repoMatch[1] : 'Unknown';
              const bountyLabel = issue.labels.find(l => 
                l.name.toLowerCase().includes('bounty') || l.name.includes('💰')
              );
              
              return (
                <a 
                  key={issue.id} 
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.bountyCard}
                >
                  <div className={styles.bountyBadge}>
                    {bountyLabel?.name || '💰 Bounty'}
                  </div>
                  <h3 className={styles.bountyTitle}>{issue.title}</h3>
                  <span className={styles.bountyRepo}>{repoName}</span>
                  <span className={styles.bountySource}>GitHub</span>
                </a>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No bounty issues available right now. Check back soon!</p>
          </div>
        )}
      </section>

      {/* Active Contributors - Real Data */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🔥 Active Contributors</h2>
        {activeContributors.length > 0 ? (
          <div className={styles.contributorsGrid}>
            {activeContributors.slice(0, 4).map(contributor => (
              <div key={contributor.id} className={styles.contributorCard}>
                <img 
                  src={contributor.avatar_url} 
                  alt={contributor.username} 
                  className={styles.contributorAvatar}
                />
                <span className={styles.contributorName}>{contributor.username}</span>
                <span className={styles.contributorPrs}>{contributor.contribution_count} actions</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Be the first contributor! Sign in and start tracking issues.</p>
          </div>
        )}
      </section>

      {/* Events Section */}
      {events.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>🎉 Contribution Events</h2>
            <Link href="/events" className={styles.viewAllLink}>View all →</Link>
          </div>
          <div className={styles.eventsGrid}>
            {events.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} variant="compact" />
            ))}
          </div>
        </section>
      )}

      {/* Good First Issues */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>🚀 Good First Issues</h2>
          <Link href="/discover?tab=issues" className={styles.viewAllLink}>View all →</Link>
        </div>
        <div className={styles.issuesGrid}>
          {beginnerIssues.slice(0, 6).map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      </section>

      {/* Trending Repos */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>📈 Trending This Week</h2>
          <Link href="/discover" className={styles.viewAllLink}>View all →</Link>
        </div>
        <div className={styles.trendingGrid}>
          {trendingRepos.slice(0, 6).map((repo) => (
            <a 
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.trendingCard}
            >
              <div className={styles.trendingHeader}>
                <img src={repo.owner.avatar_url} alt="" className={styles.trendingAvatar} />
                <span className={styles.trendingName}>{repo.full_name}</span>
              </div>
              <p className={styles.trendingDesc}>{repo.description}</p>
              <div className={styles.trendingStats}>
                <span>⭐ {repo.stargazers_count.toLocaleString()}</span>
                <span>🔀 {repo.forks_count.toLocaleString()}</span>
                {repo.language && <span className={styles.language}>{repo.language}</span>}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <h2>Ready to start contributing?</h2>
        <p>Join thousands of developers building open source together.</p>
        <Link href="/discover" className={styles.primaryBtn}>
          Get Started Free
        </Link>
      </section>
    </div>
  );
}
