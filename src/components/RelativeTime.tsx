'use client';

import { useNow } from '@/hooks/useNow';

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
const absolute = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function relativeTime(iso: string, now: number) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

/** "3 days ago" that updates live; renders the absolute date until hydrated. */
export default function RelativeTime({ date, className, prefix }: { date: string; className?: string; prefix?: string }) {
  const now = useNow(60_000);
  const text = now === null ? absolute.format(new Date(date)) : relativeTime(date, now);
  return (
    <time dateTime={date} className={className} title={new Date(date).toUTCString()}>
      {prefix ? `${prefix} ${text}` : text}
    </time>
  );
}
