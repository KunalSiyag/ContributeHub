import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { ContributionEvent } from '@/types';
import { getEditionsInRange, type OfficialSchedules } from '@/lib/events';
import { editionShortTitle, formatDateRange, todayISO } from './program-format';
import styles from './YearTimeline.module.css';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface AxisMonth {
  year: number;
  month: number; // 1–12
  showYear: boolean;
}

interface Bar {
  key: string;
  kind: 'apps' | 'program';
  start: number;
  end: number;
  clipStart: boolean;
  clipEnd: boolean;
  state: 'past' | 'now' | 'later';
  label: string;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Twelve month columns starting with the month that contains `now`. */
export function timelineRange(now: Date = new Date()) {
  const startYear = now.getUTCFullYear();
  const startMonth = now.getUTCMonth() + 1;
  const months: AxisMonth[] = Array.from({ length: 12 }, (_, index) => {
    const offset = startMonth - 1 + index;
    const month = (offset % 12) + 1;
    return { year: startYear + Math.floor(offset / 12), month, showYear: index === 0 || month === 1 };
  });
  const last = months[months.length - 1];
  return {
    months,
    from: `${startYear}-${pad(startMonth)}-01`,
    to: `${last.year}-${pad(last.month)}-${pad(daysInMonth(last.year, last.month))}`,
    label: `${MONTH_LABELS[startMonth - 1]} ${startYear} – ${MONTH_LABELS[last.month - 1]} ${last.year}`,
    spoken: `${MONTH_NAMES[startMonth - 1]} ${startYear} to ${MONTH_NAMES[last.month - 1]} ${last.year}`,
  };
}

/**
 * Position of a date on the axis as a fraction of its width. Every month gets
 * an equal column and its days split that column evenly, so bars line up
 * exactly with the month gridlines.
 */
function axisPosition(dateStr: string, first: AxisMonth, edge: 'start' | 'end'): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const index = (year - first.year) * 12 + (month - first.month);
  return (index + (edge === 'start' ? day - 1 : day) / daysInMonth(year, month)) / 12;
}

function barsFor(edition: ContributionEvent, first: AxisMonth, today: string): Bar[] {
  const windows: Array<{ kind: Bar['kind']; start: string; end: string }> = [];
  if (edition.applicationStart && edition.applicationDeadline) {
    windows.push({ kind: 'apps', start: edition.applicationStart, end: edition.applicationDeadline });
  }
  windows.push({ kind: 'program', start: edition.contributionStart, end: edition.contributionEnd });

  const name = editionShortTitle(edition);

  return windows.flatMap(window => {
    const start = axisPosition(window.start, first, 'start');
    const end = axisPosition(window.end, first, 'end');
    if (end <= 0 || start >= 1) return [];

    const state: Bar['state'] = window.end < today ? 'past' : window.start <= today ? 'now' : 'later';
    const what = window.kind === 'apps' ? 'applications' : 'program';
    const suffix = {
      past: window.kind === 'apps' ? ', closed' : ', ended',
      now: window.kind === 'apps' ? ', open now' : ', running now',
      later: '',
    }[state];

    return [
      {
        key: `${edition.slug}-${window.kind}`,
        kind: window.kind,
        start: Math.max(0, start),
        end: Math.min(1, end),
        clipStart: start < 0,
        clipEnd: end > 1,
        state,
        label: `${name} ${what}, ${formatDateRange(window.start, window.end, ' to ')}${suffix}`,
      },
    ];
  });
}

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ');
}

interface YearTimelineProps {
  /** Current editions, one row each, in display order. */
  programs: ContributionEvent[];
  now?: Date;
  /** Published dates that replace calendar rules (see programs.server.ts). */
  official?: OfficialSchedules;
}

export default function YearTimeline({ programs, now = new Date(), official }: YearTimelineProps) {
  const range = timelineRange(now);
  const first = range.months[0];
  const today = todayISO(now);
  const editions = getEditionsInRange(range.from, range.to, now, official);
  // Middle of today's day cell; today always falls in the first column.
  const todayX = axisPosition(today, first, 'start') + 0.5 / daysInMonth(first.year, first.month) / 12;

  const rows = programs.map(program => ({
    program,
    bars: editions
      .filter(edition => edition.programKey === program.programKey)
      .flatMap(edition => barsFor(edition, first, today))
      .sort((a, b) => a.start - b.start),
  }));

  return (
    <div className={styles.wrap}>
      <div
        className={styles.scroller}
        role="region"
        aria-label={`Program timeline, ${range.spoken}`}
        tabIndex={0}
      >
        <div className={styles.chart}>
          <div className={styles.corner} aria-hidden="true" />
          <div className={styles.axis} aria-hidden="true">
            {range.months.map(month => (
              <span key={`${month.year}-${month.month}`} className={styles.month}>
                <span>{MONTH_LABELS[month.month - 1]}</span>
                <span className={styles.year}>{month.showYear ? month.year : ' '}</span>
              </span>
            ))}
          </div>
          <div className={styles.grid} aria-hidden="true">
            {range.months.map(month => (
              <span key={`${month.year}-${month.month}`} className={styles.gridCell} />
            ))}
          </div>

          <ul className={styles.tracks}>
            {rows.map(({ program, bars }) => (
              <li key={program.programKey} className={styles.track}>
                <Link href={`/events/${program.slug}`} className={styles.trackLabel}>
                  {program.shortName}
                </Link>
                <div className={styles.lane}>
                  {bars.map(bar => (
                    <span
                      key={bar.key}
                      role="img"
                      aria-label={bar.label}
                      title={bar.label}
                      className={cx(
                        styles.bar,
                        bar.kind === 'apps' ? styles.laneTop : styles.laneBottom,
                        bar.kind === 'apps' ? styles.apps : styles.program,
                        bar.state === 'now' && (bar.kind === 'apps' ? styles.appsNow : styles.programNow),
                        bar.state === 'past' && (bar.kind === 'apps' ? styles.appsPast : styles.programPast),
                        bar.clipStart && styles.clipStart,
                        bar.clipEnd && styles.clipEnd
                      )}
                      style={{ '--start': `${(bar.start * 100).toFixed(3)}%`, '--end': `${(bar.end * 100).toFixed(3)}%` } as CSSProperties}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.cornerBottom} aria-hidden="true" />
          <div className={styles.todayLayer} aria-hidden="true">
            <span className={styles.today} style={{ '--x': `${(todayX * 100).toFixed(3)}%` } as CSSProperties}>
              <span className={styles.todayLine} />
              <span className={styles.todayLabel}>Today</span>
            </span>
          </div>
        </div>
      </div>

      <ul className={styles.legend} aria-label="Legend">
        <li className={styles.legendItem}>
          <span className={cx(styles.swatch, styles.apps)} aria-hidden="true" />
          Applications
        </li>
        <li className={styles.legendItem}>
          <span className={cx(styles.swatch, styles.program)} aria-hidden="true" />
          Program
        </li>
        <li className={styles.legendItem}>
          <span className={styles.swatchPair} aria-hidden="true">
            <span className={cx(styles.swatch, styles.apps, styles.appsNow)} />
            <span className={cx(styles.swatch, styles.program, styles.programNow)} />
          </span>
          Open or running now
        </li>
        <li className={styles.legendItem}>
          <span className={styles.swatchToday} aria-hidden="true" />
          Today
        </li>
      </ul>
    </div>
  );
}
