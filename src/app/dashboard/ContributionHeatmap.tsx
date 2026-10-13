'use client';

import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Segmented } from '@/components/ui/Tabs';
import styles from './overview.module.css';

export interface CalendarDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayFormat = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** GitHub-style contribution calendar. Cells carry hover tooltips; a monthly table is the non-hover view. */
export default function ContributionHeatmap({ days, total }: { days: CalendarDay[]; total: number }) {
  const [mode, setMode] = useState<'calendar' | 'table'>('calendar');
  const [tip, setTip] = useState<{ x: number; y: number; day: CalendarDay } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { cells, months, monthly } = useMemo(() => {
    const offset = days.length ? weekday(days[0].date) : 0;
    const cells: Array<CalendarDay | null> = [...Array.from({ length: offset }, () => null), ...days];
    const months: Array<{ label: string; column: number }> = [];
    const monthly = new Map<string, number>();
    days.forEach((day, index) => {
      const [y, m, d] = day.date.split('-').map(Number);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      monthly.set(key, (monthly.get(key) ?? 0) + day.count);
      if (d <= 7 && weekday(day.date) === 0) {
        const column = Math.floor((index + offset) / 7);
        if (!months.length || column - months[months.length - 1].column >= 3) months.push({ label: MONTHS[m - 1], column });
      }
    });
    return { cells, months, monthly: Array.from(monthly.entries()) };
  }, [days]);

  // Show the most recent weeks first on narrow screens.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [mode]);

  const columns = Math.ceil(cells.length / 7);

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-date]');
    const wrap = wrapRef.current;
    if (!target || !wrap) {
      setTip(null);
      return;
    }
    const day = days.find(d => d.date === target.dataset.date);
    if (!day) return;
    const cell = target.getBoundingClientRect();
    const box = wrap.getBoundingClientRect();
    setTip({ x: cell.left - box.left + cell.width / 2, y: cell.top - box.top, day });
  };

  return (
    <div className={styles.heatmap} ref={wrapRef}>
      <div className={styles.heatmapHead}>
        <p className={styles.heatmapTotal}>
          <strong className="tabular">{total.toLocaleString('en-US')}</strong> contributions in the last year
        </p>
        <Segmented
          label="Contribution view"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'calendar', label: 'Calendar' },
            { value: 'table', label: 'By month' },
          ]}
        />
      </div>

      {mode === 'calendar' ? (
        <>
          <div className={styles.heatmapScroll} ref={scrollRef}>
            <div className={styles.heatmapFrame} style={{ ['--weeks' as string]: columns }}>
              <div className={styles.heatmapMonths} aria-hidden="true">
                {months.map(month => (
                  <span key={`${month.label}-${month.column}`} style={{ gridColumnStart: month.column + 1 }}>
                    {month.label}
                  </span>
                ))}
              </div>
              <div className={styles.heatmapDays} aria-hidden="true">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>
              <div
                className={styles.heatmapGrid}
                role="img"
                aria-label={`Contribution calendar: ${total} contributions in the last year. Use "By month" for exact numbers.`}
                onPointerMove={onPointer}
                onPointerLeave={() => setTip(null)}
              >
                {cells.map((day, index) =>
                  day ? (
                    <span key={day.date} className={styles.heatCell} data-date={day.date} data-level={day.level} />
                  ) : (
                    <span key={`pad-${index}`} className={styles.heatPad} />
                  )
                )}
              </div>
            </div>
          </div>
          {tip && (
            <div className={styles.heatTip} style={{ left: tip.x, top: tip.y }} role="tooltip">
              <strong className="tabular">
                {tip.day.count === 0 ? 'No' : tip.day.count} {tip.day.count === 1 ? 'contribution' : 'contributions'}
              </strong>
              <span>{dayFormat.format(new Date(`${tip.day.date}T00:00:00Z`))}</span>
            </div>
          )}
          <div className={styles.heatLegend} aria-hidden="true">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <span key={level} className={styles.heatCell} data-level={level} />
            ))}
            <span>More</span>
          </div>
        </>
      ) : (
        <table className={styles.monthTable}>
          <caption className="visually-hidden">Contributions per month</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Contributions</th>
            </tr>
          </thead>
          <tbody>
            {monthly
              .slice()
              .reverse()
              .map(([key, count]) => {
                const [y, m] = key.split('-').map(Number);
                return (
                  <tr key={key}>
                    <td>
                      {MONTHS[m - 1]} {y}
                    </td>
                    <td className="tabular">{count.toLocaleString('en-US')}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}
    </div>
  );
}
