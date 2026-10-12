'use client';

import { useNow } from '@/hooks/useNow';
import { formatDeadlineDate } from '@/lib/events';

interface CountdownProps {
  /** ISO date (YYYY-MM-DD); the deadline is the end of that day, UTC. */
  date: string;
  /** "short" → "21d 4h", "long" → "21 days, 4 hours", "days" → "21 days". */
  format?: 'short' | 'long' | 'days';
  className?: string;
}

function parts(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  return { d: Math.floor(minutes / 1440), h: Math.floor((minutes % 1440) / 60), m: minutes % 60 };
}

/** Live "time left" text. Server/hydration render shows the date instead. */
export default function Countdown({ date, format = 'short', className }: CountdownProps) {
  const now = useNow(60_000);
  const target = new Date(`${date}T23:59:59Z`).getTime();

  let text: string;
  if (now === null) {
    text = formatDeadlineDate(date);
  } else {
    const diff = target - now;
    if (diff <= 0) text = 'Closed';
    else {
      const { d, h, m } = parts(diff);
      if (format === 'days') text = d === 0 ? 'Today' : d === 1 ? '1 day' : `${d} days`;
      else if (format === 'long')
        text = d > 0 ? `${d} ${d === 1 ? 'day' : 'days'}, ${h} ${h === 1 ? 'hour' : 'hours'}` : `${h}h ${m}m`;
      else text = d > 0 ? `${d}d ${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
    }
  }

  return (
    <time dateTime={date} className={className ? `${className} tabular` : 'tabular'} title={formatDeadlineDate(date)}>
      {text}
    </time>
  );
}
