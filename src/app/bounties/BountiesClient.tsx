'use client';

import { useState } from 'react';
import { BountyIssue, BountySource } from '@/lib/bounties';
import styles from './page.module.css';

interface BountiesClientProps {
  initialBounties: BountyIssue[];
}

const SOURCES: { value: BountySource; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'github', label: 'GitHub' },
];

export default function BountiesClient({ initialBounties }: BountiesClientProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activeSource, setActiveSource] = useState<BountySource | 'all'>('all');

  const bounties = initialBounties;

  // Extract unique languages
  const languages = ['all', ...Array.from(new Set(bounties.map(b => 
    b.labels.find(l => ['javascript', 'typescript', 'python', 'go', 'java', 'rust'].includes(l.toLowerCase())) || 'other'
  )))];

  const filteredBounties = bounties
    .filter(b => activeSource === 'all' || b.source === activeSource)
    .filter(b => {
      if (selectedLanguage === 'all') return true;
      const bLangs = b.labels.map(l => l.toLowerCase());
      if (selectedLanguage === 'other') {
        return !bLangs.some(l => ['javascript', 'typescript', 'python', 'go', 'java', 'rust'].includes(l));
      }
      return bLangs.includes(selectedLanguage.toLowerCase());
    })
    .sort((a, b) => {
      const amountA = parseFloat(a.bountyAmount.replace(/[^0-9.]/g, ''));
      const amountB = parseFloat(b.bountyAmount.replace(/[^0-9.]/g, ''));
      return sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
    });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>💰 Bounty Issues</h1>
        <p>Find open source issues with rewards and get paid for your contributions.</p>
      </header>

      {/* Controls Container */}
      <div className={styles.controls}>
        {/* Source Tabs */}
        <div className={styles.tabs}>
          {SOURCES.map(source => (
            <button
              key={source.value}
              className={`${styles.tab} ${activeSource === source.value ? styles.active : ''}`}
              onClick={() => setActiveSource(source.value)}
            >
              {source.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <select 
            value={selectedLanguage} 
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className={styles.select}
          >
            <option value="all">All Languages</option>
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="go">Go</option>
            <option value="java">Java</option>
            <option value="rust">Rust</option>
          </select>

          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className={styles.select}
          >
            <option value="desc">Highest Reward</option>
            <option value="asc">Lowest Reward</option>
          </select>
        </div>
      </div>

      {/* Bounties Grid */}
      <div className={styles.grid}>
        {filteredBounties.length === 0 ? (
          <div className={styles.empty}>
            No bounties found matching your filters.
          </div>
        ) : (
          filteredBounties.map(bounty => (
            <a
              key={bounty.id}
              href={bounty.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <span className={styles.bountyAmount}>{bounty.bountyAmount}</span>
                <span className={`${styles.source} ${styles[bounty.source]}`}>
                  {bounty.source}
                </span>
              </div>
              <h3 className={styles.cardTitle}>{bounty.title}</h3>
              <span className={styles.repo}>{bounty.repo}</span>
              <div className={styles.labels}>
                {bounty.labels.slice(0, 3).map(label => (
                  <span key={label} className={styles.label}>{label}</span>
                ))}
              </div>
            </a>
          ))
        )}
      </div>

      {/* Info Section */}
      <section className={styles.infoSection}>
        <h2>How Bounties Work</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>🔍</span>
            <h3>Find an Issue</h3>
            <p>Browse bounty issues from GitHub and Gitcoin</p>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>💻</span>
            <h3>Submit a PR</h3>
            <p>Fork the repo, fix the issue, and submit a pull request</p>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>💰</span>
            <h3>Get Paid</h3>
            <p>Once merged, receive the bounty payment</p>
          </div>
        </div>
      </section>
    </div>
  );
}
