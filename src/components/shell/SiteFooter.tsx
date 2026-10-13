import Link from 'next/link';
import LogoMark from '../LogoMark';
import Frame from '../fx/Frame';
import { REPO_URL } from '@/lib/site';
import styles from './Shell.module.css';

export default function SiteFooter({ compact = false }: { compact?: boolean }) {
  const year = new Date().getFullYear();

  if (compact) {
    return (
      <footer className={styles.appFooter}>
        <span>© {year} Orion · Data from the GitHub API</span>
        <nav aria-label="Footer">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            Source
          </a>
          <Link href="/feed.xml">RSS</Link>
          <Link href="/support">Support</Link>
          <a href="https://x.com/dazzbuilds" target="_blank" rel="noopener noreferrer">
            @dazzbuilds
          </a>
        </nav>
      </footer>
    );
  }

  return (
    <footer className={styles.footer}>
      <div className="container">
        <Frame className={styles.footerFrame}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <Link href="/" className={styles.brand} aria-label="Orion home">
                <LogoMark size={20} />
                Orion
              </Link>
              <p>A workspace for open source contributors. Every list is a live GitHub query.</p>
            </div>
            <span className={styles.footerStatus}>
              <i aria-hidden="true" />
              Live data from GitHub
            </span>
          </div>

          <div className={styles.footerCols}>
            <nav className={styles.footerCol} aria-label="Product">
              <span className="eyebrow">Product</span>
              <Link href="/discover">Discover</Link>
              <Link href="/trending">Rising repositories</Link>
              <Link href="/starter">Starter projects</Link>
              <Link href="/collections">Collections</Link>
              <Link href="/issues">Tracker</Link>
              <Link href="/alerts">Alerts</Link>
              <Link href="/dashboard">Overview</Link>
              <Link href="/resume">Resume match</Link>
            </nav>

            <nav className={styles.footerCol} aria-label="Opportunities">
              <span className="eyebrow">Opportunities</span>
              <Link href="/events">Programs</Link>
              <Link href="/bounties">Bounties</Link>
              <Link href="/discover?tab=organizations">Organizations</Link>
              <Link href="/companies">Open source companies</Link>
              <Link href="/community">Community</Link>
              <Link href="/resources">Resources</Link>
              <Link href="/perks">Perks for open source</Link>
            </nav>

            <nav className={styles.footerCol} aria-label="Programs">
              <span className="eyebrow">Programs</span>
              <Link href="/events/gsoc">Google Summer of Code</Link>
              <Link href="/events/hacktoberfest">Hacktoberfest</Link>
              <Link href="/events/outreachy">Outreachy</Link>
              <Link href="/events/lfx-mentorship">LFX Mentorship</Link>
            </nav>

            <nav className={styles.footerCol} aria-label="Project">
              <span className="eyebrow">Project</span>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                Source on GitHub
              </a>
              <Link href="/feed.xml">Deadlines RSS</Link>
              <Link href="/repo-bot">Repo bot for maintainers</Link>
              <Link href="/support">Support Orion</Link>
              <a href="https://x.com/dazzbuilds" target="_blank" rel="noopener noreferrer">
                @dazzbuilds
              </a>
            </nav>
          </div>

          <div className={styles.footerBottom}>
            <span>© {year} Orion</span>
            <span>Program dates change. Confirm on each official site before applying.</span>
          </div>
        </Frame>
      </div>
    </footer>
  );
}
