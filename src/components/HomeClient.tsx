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

interface HomeClientProps {
  trendingRepos: Repository[];
  beginnerIssues: Issue[];
  events: ContributionEvent[];
}

// Mock active contributors (would come from Supabase in production)
const activeContributors = [
  { id: 1, name: 'Sarah Chen', avatar: 'https://i.pravatar.cc/150?img=5', prs: 23 },
  { id: 2, name: 'Alex Kim', avatar: 'https://i.pravatar.cc/150?img=12', prs: 18 },
  { id: 3, name: 'Jordan Lee', avatar: 'https://i.pravatar.cc/150?img=8', prs: 15 },
  { id: 4, name: 'Riley Taylor', avatar: 'https://i.pravatar.cc/150?img=20', prs: 12 },
];

// Mock bounty issues
const bountyIssues = [
  { id: 1, title: 'Add dark mode support', repo: 'ossium/web', bounty: '$100', source: 'github' },
  { id: 2, title: 'Fix memory leak in parser', repo: 'rust-lang/rust', bounty: '$250', source: 'gitcoin' },
  { id: 3, title: 'Implement OAuth2 flow', repo: 'supabase/auth', bounty: '$150', source: 'github' },
];

export default function HomeClient({ trendingRepos, beginnerIssues, events }: HomeClientProps) {
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
          
          {/* Stats */}
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>50K+</span>
              <span className={styles.statLabel}>Projects</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>10K+</span>
              <span className={styles.statLabel}>Contributors</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>$25K+</span>
              <span className={styles.statLabel}>Bounties</span>
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

      {/* Bounty Issues Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>💰 Bounty Issues</h2>
          <div className={styles.bountyTabs}>
            <button className={`${styles.tab} ${styles.active}`}>All</button>
            <button className={styles.tab}>GitHub</button>
            <button className={styles.tab}>Gitcoin</button>
          </div>
        </div>
        <div className={styles.bountyGrid}>
          {bountyIssues.map(issue => (
            <div key={issue.id} className={styles.bountyCard}>
              <div className={styles.bountyBadge}>{issue.bounty}</div>
              <h3 className={styles.bountyTitle}>{issue.title}</h3>
              <span className={styles.bountyRepo}>{issue.repo}</span>
              <span className={styles.bountySource}>{issue.source}</span>
            </div>
          ))}
        </div>
        <Link href="/bounties" className={styles.viewAllLink}>
          View all bounties →
        </Link>
      </section>

      {/* Active Contributors */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🔥 Active Contributors</h2>
        <div className={styles.contributorsGrid}>
          {activeContributors.map(contributor => (
            <div key={contributor.id} className={styles.contributorCard}>
              <img 
                src={contributor.avatar} 
                alt={contributor.name} 
                className={styles.contributorAvatar}
              />
              <span className={styles.contributorName}>{contributor.name}</span>
              <span className={styles.contributorPrs}>{contributor.prs} PRs</span>
            </div>
          ))}
        </div>
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
