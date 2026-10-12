/** All-day calendar entries for an iCalendar (RFC 5545) feed. */
export interface CalendarEntry {
  /** Stable across refreshes, so calendar apps update instead of duplicating. */
  uid: string;
  /** ISO day. */
  date: string;
  title: string;
  description?: string;
  url?: string;
}

const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (new TextEncoder().encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else current += char;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const day = (iso: string) => iso.replace(/-/g, '');
function nextDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return day(d.toISOString().slice(0, 10));
}

export function icsCalendar(name: string, entries: CalendarEntry[], now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Orion//Open Source Hub//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
    ...entries.flatMap(entry => [
      'BEGIN:VEVENT',
      `UID:${entry.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(entry.date)}`,
      `DTEND;VALUE=DATE:${nextDay(entry.date)}`,
      `SUMMARY:${escapeText(entry.title)}`,
      ...(entry.description ? [`DESCRIPTION:${escapeText(entry.description)}`] : []),
      ...(entry.url ? [`URL:${entry.url}`] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
