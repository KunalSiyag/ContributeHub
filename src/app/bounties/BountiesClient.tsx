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
  { value: 'gitcoin', label: 'Gitcoin' },
];

export default function BountiesClient({ initialBounties }: BountiesClientProps) {
  const [activeSource, setActiveSource] = useState<BountySource>('all');
  const [bounties, setBounties] = useState<BountyIssue[]>(initialBounties);

  const filteredBounties = activeSource === 'all' 
    ? bounties 
    : bounties.filter(b => b.source === activeSource);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>💰 Bounty Issues</h1>
        <p>Find open source issues with rewards and get paid for your contributions.</p>
      </header>

      {/* Source Tabs */}
      <div className={styles.tabs}>
        {SOURCES.map(source => (
          <button
            key={source.value}
            className={`${styles.tab} ${activeSource === source.value ? styles.active : ''}`}
            onClick={() => setActiveSource(source.value)}
          >
            {source.label}
            <span className={styles.count}>
              {source.value === 'all' 
                ? bounties.length 
                : bounties.filter(b => b.source === source.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Bounties Grid */}
      <div className={styles.grid}>
        {filteredBounties.length === 0 ? (
          <div className={styles.empty}>
            No bounties found for this source.
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
