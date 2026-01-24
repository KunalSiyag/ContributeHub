'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Repository, Issue, ContributionEvent } from '@/types';
import IssueCard from './IssueCard';
import EventCard from './EventCard';
import styles from '../app/page.module.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

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

// Basic Typewriter Hook
const useTypewriter = (words: string[], speed = 150, pause = 1500) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);
  
  useEffect(() => {
    if (index === words.length) return;

    if (subIndex === words[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), pause);
      return;
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, Math.max(reverse ? 75 : speed, parseInt(Math.random() * 350)));

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words, speed, pause]);

  // Blink cursor
  useEffect(() => {
    const timeout2 = setTimeout(() => {
      setBlink((prev) => !prev);
    }, 500);
    return () => clearTimeout(timeout2);
  }, [blink]);

  return `${words[index].substring(0, subIndex)}${blink ? "|" : " "}`;
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
  const typewriterText = useTypewriter(['Get Paid.', 'Level Up.', 'Make Impact.', 'Join GSoC.'], 100, 2000);

  const [activeFeature, setActiveFeature] = useState(0);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Hero Animations
    tl.from(`.${styles.heroTitle}`, {
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'elastic.out(1, 0.75)',
    })
    .from(`.${styles.heroSubtitle}`, {
      y: 20,
      opacity: 0,
      duration: 0.8,
    }, '-=0.6')
    .from(`.${styles.heroCta} > *`, {
      y: 20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
    }, '-=0.4')
    .from(`.${styles.heroStats}`, {
      y: 30,
      opacity: 0,
      duration: 0.8,
    }, '-=0.4');

    // Scroll Animations
    // Dazzle Scroll Effect for Sections
    gsap.utils.toArray<HTMLElement>(`.${styles.section}`).forEach((section) => {
      gsap.fromTo(section.children, 
        {
          y: 50,
          opacity: 0,
          scale: 0.95,
          filter: 'blur(10px) brightness(1.2)', // The "Dazzle" effect
        },
        {
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
          y: 0,
          opacity: 1,
          scale: 1,
          filter: 'blur(0px) brightness(1)',
          duration: 1,
          stagger: 0.1,
          ease: 'power4.out',
        }
      );
    });

    // Synced Scroll Feature - Updates Active Feature State on Scroll
    const cards = document.querySelectorAll(`.${styles.featureDetailCard}`);
    cards.forEach((card, index) => {
      ScrollTrigger.create({
        trigger: card,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => setActiveFeature(index),
        onEnterBack: () => setActiveFeature(index),
      });
    });

  }, { scope: container });

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K+`;
    return num.toString();
  };

  return (
    <div ref={container} className={styles.homePage}>
      {/* Photogenic Blur Background */}
      <div className={styles.photogenicWrapper}>
        <div className={`${styles.blurBlob} ${styles.blob1}`}></div>
        <div className={`${styles.blurBlob} ${styles.blob2}`}></div>
        <div className={`${styles.blurBlob} ${styles.blob3}`}></div>
      </div>

      {/* Hero Section - Full Screen */}
      <section className={styles.hero}>
        {/* ... existing hero content ... */}
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Ship Code. <span className={styles.gradientText}>{typewriterText}</span><br />
            Accelerate Your Career.
          </h1>
          <p className={styles.heroSubtitle}>
            GitHub has over 20 million open issues waiting for you. We just make them easy to find.
            Stop scrolling endlessly—ContributeHub curates the perfect "Good First Issues," bounties, and hackathons tailored to your skills.
          </p>
          <div className={styles.heroCta}>
            <Link href="/discover" className={`${styles.primaryBtn} ${styles.wompy}`}>
              Start Contributing Now
            </Link>
            <Link href="/bounties" className={`${styles.secondaryBtn} ${styles.wompy}`}>
              Browse 50+ Bounties
            </Link>
          </div>
          
          {/* Real Stats - Embedded in Hero */}
          <div className={`${styles.heroStats} ${styles.glassy}`}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{formatNumber(stats.totalUsers)}</span>
              <span className={styles.statLabel}>Global Developers</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{formatNumber(stats.totalIssues)}</span>
              <span className={styles.statLabel}>Open Issues</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{stats.totalBounties >= 500000 ? '$500K+' : formatNumber(stats.totalBounties)}</span>
              <span className={styles.statLabel}>Available Bounties</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.container}>
        {/* Features Section - Split Sticky Layout */}
        <section className={styles.section} style={{ overflow: 'visible' }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Built for Developers, by Developers</h2>
          </div>
          
          <div className={styles.splitLayout}>
            {/* Left: Sticky Visuals (Command Center) */}
            <div className={styles.stickyVisual}>
              <div className={styles.visualScreen}>
                 {/* Dashboard Mockup Container */}
                 <div style={{ position: 'relative', width: '100%', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                       <div style={{ width: '120px', height: '12px', background: '#333', borderRadius: '4px' }}></div>
                       <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#333' }}></div>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4285F4' }}></div>
                       </div>
                    </div>

                    {/* Main Content Area - Changes based on Active Feature */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                       {/* Sidebar */}
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ height: '30px', background: activeFeature === 0 ? 'rgba(66, 133, 244, 0.2)' : 'var(--color-bg-highlight)', borderRadius: '8px', border: activeFeature === 0 ? '1px solid #4285F4' : 'none', transition: 'all 0.3s' }}></div>
                          <div style={{ height: '30px', background: activeFeature === 1 ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-bg-highlight)', borderRadius: '8px', border: activeFeature === 1 ? '1px solid #22c55e' : 'none', transition: 'all 0.3s' }}></div>
                          <div style={{ height: '30px', background: activeFeature === 2 ? 'rgba(234, 179, 8, 0.2)' : 'var(--color-bg-highlight)', borderRadius: '8px', border: activeFeature === 2 ? '1px solid #eab308' : 'none', transition: 'all 0.3s' }}></div>
                          <div style={{ height: '30px', background: activeFeature === 3 ? 'rgba(156, 70, 104, 0.2)' : 'var(--color-bg-highlight)', borderRadius: '8px', border: activeFeature === 3 ? '1px solid #9C4668' : 'none', transition: 'all 0.3s' }}></div>
                       </div>
                       
                       {/* Dashboard Panel */}
                       <div style={{ background: 'var(--color-bg-primary)', borderRadius: '12px', padding: '15px', position: 'relative', overflow: 'hidden' }}>
                          {activeFeature === 0 && (
                             <div className="fade-in">
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4285F4', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Discovery Engine</div>
                                <div style={{ height: '8px', width: '60%', background: 'var(--color-bg-tertiary)', borderRadius: '4px', marginBottom: '8px' }}></div>
                                <div style={{ height: '8px', width: '40%', background: 'var(--color-bg-tertiary)', borderRadius: '4px', marginBottom: '20px' }}></div>
                                <div style={{ height: '60px', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: '0.8rem', background: 'rgba(66,133,244,0.05)' }}>
                                   <span style={{ marginRight: '8px', color: '#4285F4' }}>●</span> Matches Found: 128
                                </div>
                             </div>
                          )}
                          {activeFeature === 1 && (
                             <div className="fade-in">
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Impact Growth</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', marginBottom: '10px', borderBottom: '1px solid var(--color-border)', paddingBottom: '5px' }}>
                                   <div style={{ width: '8px', height: '20%', background: '#22c55e' }}></div>
                                   <div style={{ width: '8px', height: '50%', background: '#22c55e' }}></div>
                                   <div style={{ width: '8px', height: '30%', background: '#22c55e' }}></div>
                                   <div style={{ width: '8px', height: '80%', background: '#22c55e' }}></div>
                                   <div style={{ width: '8px', height: '60%', background: '#22c55e' }}></div>
                                   <div style={{ width: '8px', height: '95%', background: '#22c55e' }}></div>
                                </div>
                                <div style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 'bold' }}>+127%</div>
                                <div style={{ fontSize: '0.7rem', color: '#666' }}>Contribution Multiplier</div>
                             </div>
                          )}
                          {activeFeature === 2 && (
                             <div className="fade-in">
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#eab308', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Bounty Wallet</div>
                                <div style={{ background: 'var(--color-bg-secondary)', padding: '15px', borderRadius: '8px', border: '1px solid #eab308' }}>
                                   <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>Available Balance</div>
                                   <div style={{ fontSize: '1.2rem', color: '#eab308', fontWeight: 'bold', fontFamily: 'monospace' }}>Aggregated Data</div>
                                   <div style={{ fontSize: '0.7rem', color: '#eab308', marginTop: '8px' }}>● Payment Verified</div>
                                </div>
                             </div>
                          )}
                           {activeFeature === 3 && (
                             <div className="fade-in">
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#9C4668', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Global Events</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: '6px' }}>
                                      <span style={{ fontSize: '0.7rem' }}>Hacktoberfest</span>
                                      <span style={{ fontSize: '0.7rem', color: '#9C4668' }}>Registered</span>
                                   </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: '6px' }}>
                                      <span style={{ fontSize: '0.7rem' }}>GSoC '26</span>
                                      <span style={{ fontSize: '0.7rem', color: '#9C4668' }}>Apply Now</span>
                                   </div>
                                </div>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Right: Scrolling Details */}
            <div className={styles.scrollingCards}>
              <div className={styles.featureDetailCard} style={{ borderColor: activeFeature === 0 ? 'var(--color-primary)' : 'var(--color-border)' }}>
                {/* Professional Icon Placeholder - SVG or Font Icon */}
                <div style={{ width: '40px', height: '40px', background: 'rgba(66, 133, 244, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                   <div style={{ width: '12px', height: '12px', border: '2px solid #4285F4', borderRadius: '50%' }}></div>
                </div>
                <h3>Smart Discovery Algorithm</h3>
                <p>Stop searching. Our matching engine analyzes 5,000+ repositories in real-time to pair your specific stack (React, Python, Go) with high-impact issues.</p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                   <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>98% Match Rate</span>
                   <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>Real-time Feeds</span>
                </div>
              </div>
              
               <div className={styles.featureDetailCard} style={{ borderColor: activeFeature === 1 ? '#22c55e' : 'var(--color-border)' }}>
                 <div style={{ width: '40px', height: '40px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                   <div style={{ width: '2px', height: '16px', background: '#22c55e', marginRight: '2px' }}></div>
                   <div style={{ width: '2px', height: '24px', background: '#22c55e' }}></div>
                </div>
                <h3>Verified Career Growth</h3>
                <p>Automated verification of your contributions. Build a portfolio that hiring managers trust, backed by immutable contribution data.</p>
                 <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                   <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>Export to PDF</span>
                   <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>Shareable Link</span>
                </div>
              </div>

               <div className={styles.featureDetailCard} style={{ borderColor: activeFeature === 2 ? '#eab308' : 'var(--color-border)' }}>
                 <div style={{ width: '40px', height: '40px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                   <div style={{ width: '16px', height: '12px', border: '2px solid #eab308', borderRadius: '2px' }}></div>
                </div>
                <h3>Direct from Maintainers</h3>
                <p>We aggregate bounty data from across the ecosystem. Payments are handled directly by repository maintainers on their respective platforms. We help you find them.</p>
                 <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                   <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>USDC / USD</span>
                   <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>Instant Settlement</span>
                </div>
              </div>

               <div className={styles.featureDetailCard} style={{ borderColor: activeFeature === 3 ? '#9C4668' : 'var(--color-border)' }}>
                 <div style={{ width: '40px', height: '40px', background: 'rgba(156, 70, 104, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                   <div style={{ width: '16px', height: '16px', border: '2px solid #9C4668', borderRadius: '50%' }}></div>
                </div>
                <h3>Global Event Registry</h3>
                <p>One-click registration for GSoC, GSSoC, and Hacktoberfest. Never miss a registration deadline with our automated calendar alerts.</p>
                 <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                   <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>Auto-Sync</span>
                   <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>Reminders</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bounty Issues Section (Platform Showcase Removed) */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>💰 High-Value Bounties</h2>
            <Link href="/bounties" className={styles.viewAllLink}>View all bounties →</Link>
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
                    className={`${styles.bountyCard} ${styles.glassy}`}
                  >
                    <div className={styles.bountyBadge}>
                      {bountyLabel?.name || '💰 Bounty'}
                    </div>
                    <h3 className={styles.bountyTitle}>{issue.title}</h3>
                    <div className={styles.bountyRepo}>{repoName}</div>
                    <span className={styles.bountySource}>Apply via GitHub</span>
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



        {/* Events Section - "Events that occur" */}
        {events.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>🎉 Annual Open Source Events</h2>
              <Link href="/events" className={styles.viewAllLink}>View full calendar →</Link>
            </div>
            <div className={styles.eventsGrid}>
              {/* Show top 3 events regardless of status - showing they are recurring */}
              {events.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} variant="compact" />
              ))}
            </div>
          </section>
        )}





        {/* Good First Issues */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>🚀 Good First Issues (Beginner Friendly)</h2>
            <Link href="/discover?tab=issues" className={styles.viewAllLink}>Browse 1000+ issues →</Link>
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
            <h2 className={styles.sectionTitle}>📈 Trending Repositories</h2>
            <Link href="/discover" className={styles.viewAllLink}>Explore all projects →</Link>
          </div>
          <div className={styles.trendingGrid}>
            {trendingRepos.slice(0, 6).map((repo) => (
              <a 
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.trendingCard} ${styles.glassy}`}
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
        <section className={`${styles.ctaSection} ${styles.glassy}`}>
          <h2>Ready to Launch Your Open Source Career?</h2>
          <p>Join 1,240+ developers shipping code and earning bounties.</p>
          <Link href="/discover" className={`${styles.primaryBtn} ${styles.wompy}`}>
            Get Started For Free
          </Link>
        </section>
      </div>
    </div>
  );
}
