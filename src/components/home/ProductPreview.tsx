import type { ReactNode } from 'react';
import type { Issue } from '@/types';
import { repoFullName } from '@/lib/github';
import Frame from '../fx/Frame';
import ScrollTilt from '../fx/ScrollTilt';
import LogoMark from '../LogoMark';
import { IconBookmark, IconCalendar, IconColumns, IconCompass, IconDollar, IconHome } from '../icons';
import styles from './home.module.css';

const COLUMNS: Array<{ label: string; tone: string }> = [
  { label: 'Saved', tone: 'var(--status-saved)' },
  { label: 'Working on it', tone: 'var(--status-working)' },
  { label: 'PR open', tone: 'var(--status-review)' },
  { label: 'Merged', tone: 'var(--status-done)' },
];

const NAV: Array<{ label: string; icon: ReactNode; active?: boolean }> = [
  { label: 'Overview', icon: <IconHome size={13} /> },
  { label: 'Tracker', icon: <IconColumns size={13} />, active: true },
  { label: 'Discover', icon: <IconCompass size={13} /> },
  { label: 'Programs', icon: <IconCalendar size={13} /> },
  { label: 'Bounties', icon: <IconDollar size={13} /> },
];

function MockCard({ issue }: { issue: Issue }) {
  return (
    <div className={styles.mockCard}>
      <span className={styles.mockRepo}>
        {repoFullName(issue.repository_url)} <span className={styles.mockNumber}>#{issue.number}</span>
      </span>
      <span className={styles.mockTitle}>{issue.title}</span>
      <span className={styles.mockTags}>
        {issue.labels.slice(0, 2).map(label => (
          <span key={label.name} className={styles.mockTag}>
            {label.name}
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * The workspace as a framed product shot. The board holds live good first
 * issues, but the window is an illustration: hidden from assistive tech and
 * not interactive (the caption below describes it).
 */
export default function ProductPreview({ issues }: { issues: Issue[] }) {
  return (
    <figure className={styles.preview}>
      <Frame className={styles.previewFrame}>
        <div className={styles.previewStage}>
          <ScrollTilt>
            <div className={styles.window} aria-hidden="true" inert>
              <div className={styles.windowBar}>
                <span className={styles.windowDots}>
                  <i />
                  <i />
                  <i />
                </span>
                <span className={styles.windowUrl}>orion / tracker</span>
                <span className={styles.windowLive}>
                  <i /> Live
                </span>
              </div>
              <div className={styles.windowBody}>
                <div className={styles.mockSidebar}>
                  <span className={styles.mockBrand}>
                    <LogoMark size={14} /> Orion
                  </span>
                  {NAV.map(item => (
                    <span key={item.label} className={item.active ? styles.mockNavActive : styles.mockNav}>
                      {item.icon}
                      {item.label}
                      {item.active && <span className={styles.mockCount}>{issues.length}</span>}
                    </span>
                  ))}
                </div>
                <div className={styles.mockMain}>
                  <div className={styles.mockHeader}>
                    <span>
                      <span className={styles.mockEyebrow}>Workspace</span>
                      <span className={styles.mockHeading}>Tracker</span>
                    </span>
                    <span className={styles.mockButton}>
                      <IconBookmark size={12} /> Find issues
                    </span>
                  </div>
                  <div className={styles.mockBoard}>
                    {COLUMNS.map((column, index) => (
                      <div key={column.label} className={styles.mockColumn}>
                        <span className={styles.mockColumnHead}>
                          <i style={{ background: column.tone }} />
                          {column.label}
                        </span>
                        {issues[index] ? (
                          <MockCard issue={issues[index]} />
                        ) : (
                          <span className={styles.mockEmpty}>{index === 3 ? 'Shipped work lands here' : 'Nothing here'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollTilt>
        </div>
      </Frame>
      <figcaption className={styles.previewCaption}>
        Your tracker, shown with live good first issues from GitHub. Save any issue in Orion to start your own.
      </figcaption>
    </figure>
  );
}
