import type { BountyIssue } from '@/lib/bounties';
import { Avatar, StatusDot, Tag } from './ui/primitives';
import RelativeTime from './RelativeTime';
import TrackControl from './TrackControl';
import { formatNumber } from '@/lib/utils';
import { IconMessageSquare, IconStar } from './icons';
import styles from './rows.module.css';

export default function BountyRow({ bounty }: { bounty: BountyIssue }) {
  const [owner] = bounty.repo.split('/');
  const known = bounty.bountyValue > 0;
  const labels = bounty.labels.filter(label => !/bounty|💰|reward/i.test(label)).slice(0, 3);

  return (
    <li className={styles.row} data-spotlight="wash">
      <div className={styles.main}>
        <div className={styles.context}>
          <a className={styles.repo} href={`https://github.com/${bounty.repo}`} target="_blank" rel="noopener noreferrer">
            <Avatar src={`https://github.com/${owner}.png?size=40`} name={owner} size={16} square className={styles.avatar} />
            <span className={styles.repoText}>{bounty.repo}</span>
          </a>
          {typeof bounty.repoStars === 'number' && (
            <span className={styles.metaItem} title="Stars on the repository that pays">
              <IconStar size={12} /> {formatNumber(bounty.repoStars)}
            </span>
          )}
          <span className={styles.sep}>·</span>
          <span className="tabular">#{bounty.number}</span>
          <span className={styles.sep}>·</span>
          <RelativeTime date={bounty.updatedAt ?? bounty.createdAt} prefix="updated" />
          {bounty.comments > 0 && (
            <>
              <span className={styles.sep}>·</span>
              <span className={styles.metaItem}>
                <IconMessageSquare size={12} /> {bounty.comments}
              </span>
            </>
          )}
        </div>
        <a href={bounty.url} target="_blank" rel="noopener noreferrer" className={`${styles.title} ${styles.stretch}`}>
          {bounty.title}
        </a>
        <div className={styles.tags}>
          <StatusDot tone={bounty.assignees > 0 ? 'neutral' : 'done'}>{bounty.assignees > 0 ? 'Assigned' : 'Unclaimed'}</StatusDot>
          {bounty.source === 'algora' && <Tag tone="muted">Algora</Tag>}
          {labels.map(label => (
            <Tag key={label} tone="muted">
              {label}
            </Tag>
          ))}
        </div>
      </div>
      <div className={styles.aside}>
        <span className={[styles.amount, !known && styles.amountUnknown].filter(Boolean).join(' ')} title={known ? 'Stated reward' : 'Reward amount not stated'}>
          {known ? bounty.bountyAmount : 'Amount TBD'}
        </span>
        <TrackControl
          issue={{
            url: bounty.url,
            number: bounty.number,
            repo: bounty.repo,
            title: bounty.title,
            labels: bounty.labels,
            hasBounty: true,
            bountyAmount: known ? bounty.bountyAmount : null,
            bountySource: bounty.source,
          }}
        />
      </div>
    </li>
  );
}
