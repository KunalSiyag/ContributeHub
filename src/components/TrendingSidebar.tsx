import Link from 'next/link';
import { Repository } from '@/types';
import { formatNumber } from '@/lib/utils';
import styles from './TrendingSidebar.module.css';

interface TrendingSidebarProps {
  repos: Repository[];
}

export default function TrendingSidebar({ repos }: TrendingSidebarProps) {
  // Use passed repos or fallback to dummy if empty (though logic suggests we fetch in page)
  const displayRepos = repos.length > 0 ? repos.slice(0, 5) : [];

  return (
    <div className={styles.sidebar}>
      <h3 className={styles.title}>Trending Libraries</h3>
      <div className={styles.list}>
        {displayRepos.map((repo) => (
          <a 
            key={repo.id} 
            href={repo.html_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.item}
          >
            <div className={styles.content}>
              <span className={styles.category}>
                {repo.language || 'Open Source'} · Trending
              </span>
              <span className={styles.name}>{repo.name}</span>
              <span className={styles.meta}>
                {formatNumber(repo.stargazers_count)} stars · {formatNumber(repo.forks_count)} forks
              </span>
            </div>
            <span className={styles.dots}>•••</span>
          </a>
        ))}
      </div>
      <Link href="/discover" className={styles.showMore}>
        Show more
      </Link>
    </div>
  );
}
