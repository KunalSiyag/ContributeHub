import Link from 'next/link';
import type { ContributionEvent } from '@/types';
import { formatDeadlineDate } from '@/lib/events';
import { datesBasis, phaseDisplay, programMonogram, PROGRAM_TYPE_LABEL } from '@/lib/program-display';
import { StatusDot, Tag } from './ui/primitives';
import Countdown from './Countdown';
import styles from './rows.module.css';

export default function ProgramRow({ event, showDescription = true }: { event: ContributionEvent; showDescription?: boolean }) {
  const phase = phaseDisplay(event);
  const basis = datesBasis(event);

  return (
    <li className={`${styles.row} ${styles.withLead}`} data-spotlight="wash">
      <span className={styles.monogram} aria-hidden="true">
        {programMonogram(event)}
      </span>
      <div className={styles.main}>
        <div className={styles.context}>
          <span>{event.organizer}</span>
          <span className={styles.sep}>·</span>
          <span>{PROGRAM_TYPE_LABEL[event.type]}</span>
          <span className={styles.sep}>·</span>
          <StatusDot tone={phase.tone} live={phase.live}>
            {phase.label}
          </StatusDot>
        </div>
        <Link href={`/events/${event.slug}`} className={`${styles.title} ${styles.stretch}`}>
          {event.name}
        </Link>
        {showDescription && <p className={styles.description}>{event.description}</p>}
        <div className={styles.tags}>
          <Tag tone={event.isPaid ? 'default' : 'muted'}>{event.isPaid ? 'Paid' : 'Unpaid'}</Tag>
          <Tag tone="muted">Remote</Tag>
          {event.cohortsNote && <Tag tone="muted">Multiple cohorts</Tag>}
          {basis.badge && <Tag tone={basis.kind === 'official' ? 'default' : 'muted'}>{basis.badge}</Tag>}
        </div>
      </div>
      <div className={`${styles.aside} ${styles.asideStack}`}>
        {event.nextDeadline ? (
          <>
            <span className="eyebrow">{event.nextDeadline.label}</span>
            <Countdown date={event.nextDeadline.date} className={styles.amount} />
            <span className={styles.asideDate}>{formatDeadlineDate(event.nextDeadline.date)}</span>
          </>
        ) : (
          <span className="eyebrow">Concluded</span>
        )}
      </div>
    </li>
  );
}
