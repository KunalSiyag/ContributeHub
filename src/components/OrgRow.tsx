import type { EnrichedOrganization } from '@/lib/organizations';
import { formatNumber } from '@/lib/utils';
import { Avatar, LanguageDot, Tag } from './ui/primitives';
import { ButtonAnchor } from './ui/Button';
import RelativeTime from './RelativeTime';
import { IconArrowUpRight, IconCircleDot, IconStar } from './icons';
import styles from './rows.module.css';

const PROGRAM_NAMES: Record<string, string> = {
  gsoc: 'GSoC',
  gssoc: 'GSSoC',
  hacktoberfest: 'Hacktoberfest',
  lfx: 'LFX',
  outreachy: 'Outreachy',
  mlh: 'MLH',
};

/** Program tags for an organization, e.g. ["GSSoC", "GSoC"]. */
export function orgPrograms(org: EnrichedOrganization): string[] {
  const keys = new Set([org.eventLabel, ...org.topics.filter(topic => topic in PROGRAM_NAMES)]);
  return Array.from(keys)
    .map(key => PROGRAM_NAMES[key])
    .filter(Boolean);
}

export default function OrgRow({ org }: { org: EnrichedOrganization }) {
  const [owner] = org.slug.split('/');
  const years = (org.participationYears ?? []).slice().sort((a, b) => b - a);
  const official = org.official;
  const logo = official?.logo;
  // Stars are only meaningful from GitHub (live) or the hand-picked seed figures.
  const showStars = org.live || !official;

  return (
    <li className={`${styles.row} ${styles.withLead}`} data-spotlight="wash">
      <Avatar
        src={logo ?? org.avatarUrl ?? `https://github.com/${owner}.png?size=72`}
        name={org.name}
        size={36}
        square
        className={logo ? styles.logoTile : undefined}
      />
      <div className={styles.main}>
        <div className={styles.context}>
          {official ? (
            <span>
              GSoC {official.year}
              {official.categories[0] && ` · ${official.categories[0]}`}
            </span>
          ) : (
            <span className={styles.repo}>
              <span className={styles.repoText}>{org.slug}</span>
            </span>
          )}
          {!org.live && !official && (
            <>
              <span className={styles.sep}>·</span>
              <span title="GitHub data unavailable; showing saved figures">cached figures</span>
            </>
          )}
        </div>
        <a
          href={official?.url ?? `https://github.com/${org.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.title} ${styles.stretch}`}
        >
          {org.name}
        </a>
        <p className={styles.description}>{org.description}</p>
        <div className={styles.meta}>
          {org.language && <LanguageDot language={org.language} />}
          {showStars && (
            <span className={styles.metaItem}>
              <IconStar size={13} /> {formatNumber(org.stars)}
            </span>
          )}
          {official && !org.live && official.tech.length > 0 && (
            <span className={styles.metaItem}>{official.tech.slice(0, 4).join(' · ')}</span>
          )}
          {typeof org.openIssues === 'number' && (
            <span className={styles.metaItem}>
              <IconCircleDot size={13} /> {formatNumber(org.openIssues)} open
            </span>
          )}
          {org.pushedAt && (
            <span className={styles.metaItem}>
              <RelativeTime date={org.pushedAt} prefix="pushed" />
            </span>
          )}
        </div>
        <div className={styles.tags}>
          {orgPrograms(org).map(program => (
            <Tag key={program}>
              {program}
            </Tag>
          ))}
          {official ? (
            <Tag tone="muted" title={`In Google Summer of Code: ${years.slice().reverse().join(', ')}`}>
              {years.length > 1 ? `${years.length} GSoC years · since ${years[years.length - 1]}` : 'First year in GSoC'}
            </Tag>
          ) : (
            years.length > 0 && (
              <Tag tone="muted" title={`Participated: ${years.join(', ')}`}>
                {years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : years[0]}
              </Tag>
            )
          )}
        </div>
      </div>
      <div className={styles.aside}>
        {official?.ideas && (
          <ButtonAnchor href={official.ideas} variant="secondary" size="sm">
            Project ideas
            <IconArrowUpRight size={13} />
          </ButtonAnchor>
        )}
        {org.goodFirstIssuesUrl !== official?.ideas && (
          <ButtonAnchor href={org.goodFirstIssuesUrl} variant="secondary" size="sm">
            Good first issues
            <IconArrowUpRight size={13} />
          </ButtonAnchor>
        )}
      </div>
    </li>
  );
}
