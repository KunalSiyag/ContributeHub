import { ImageResponse } from 'next/og';
import type { ContributionEvent } from '@/types';
import {
  daysUntil,
  formatDeadlineDate,
  getCohortLabel,
  getCurrentEditionForProgram,
  getEventBySlug,
} from '@/lib/events';
import { getOfficialSchedules } from '@/lib/programs.server';

export const alt = 'Program dates and deadlines on Orion';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

// Token values from globals.css (light theme); image routes can't read CSS variables.
const BG = '#fafafa';
const SURFACE = '#ffffff';
const FG = '#171717';
const FG_2 = '#4d4d4d';
const FG_3 = '#666666';
const LINE = '#ebebeb';
const ACCENT = '#297a3a';

// Orion constellation (same geometry as LogoMark, 24×24 viewBox).
const STARS: Array<[number, number, number]> = [
  [6.2, 4.6, 1.9],
  [17.3, 5.4, 1.5],
  [9.4, 11.4, 1.45],
  [12, 12.3, 1.45],
  [14.6, 13.2, 1.45],
  [7.5, 19.4, 1.55],
  [17.7, 19.1, 2.35],
];
const LINKS: Array<[number, number, number, number]> = [
  [6.2, 4.6, 9.4, 11.4],
  [17.3, 5.4, 14.6, 13.2],
  [9.4, 11.4, 12, 12.3],
  [12, 12.3, 14.6, 13.2],
  [9.4, 11.4, 7.5, 19.4],
  [14.6, 13.2, 17.7, 19.1],
];

function Mark() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      {LINKS.map(([x1, y1, x2, y2], index) => (
        <line
          key={index}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={FG}
          strokeOpacity="0.42"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      ))}
      {STARS.map(([cx, cy, r], index) => (
        <circle key={index} cx={cx} cy={cy} r={r} fill={FG} />
      ))}
    </svg>
  );
}

function daysLeft(date: string): string {
  const days = daysUntil(date);
  if (days <= 0) return 'today';
  return days === 1 ? '1 day left' : `${days} days left`;
}

function Card({
  title,
  subtitle,
  detail,
  footer,
  status,
}: {
  title: string;
  subtitle?: string;
  detail: string;
  footer: string;
  status?: { label: string; live: boolean };
}) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', padding: 40, background: BG }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          border: `1px solid ${LINE}`,
          borderRadius: 6,
          background: SURFACE,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Mark />
            <div style={{ display: 'flex', fontSize: 18, letterSpacing: 4, color: FG_3 }}>ORION · PROGRAMS</div>
          </div>
          {status && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, letterSpacing: 3, color: FG_3 }}>
              <div
                style={{ width: 10, height: 10, borderRadius: 999, background: status.live ? ACCENT : FG_3 }}
              />
              <div style={{ display: 'flex' }}>{status.label.toUpperCase()}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -3,
              color: FG,
            }}
          >
            {title}
          </div>
          {subtitle && <div style={{ display: 'flex', fontSize: 40, letterSpacing: -1, color: FG_3 }}>{subtitle}</div>}
          <div style={{ display: 'flex', marginTop: 8, fontSize: 30, color: FG_2 }}>{detail}</div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 32,
            paddingTop: 28,
            borderTop: `1px solid ${LINE}`,
            fontSize: 22,
            color: FG_3,
          }}
        >
          <div style={{ display: 'flex' }}>{footer}</div>
          <div style={{ display: 'flex' }}>Dates follow the usual schedule</div>
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<NonNullable<ContributionEvent['phase']>, { label: string; live: boolean }> = {
  'applications-open': { label: 'Applications open', live: true },
  running: { label: 'Running', live: true },
  'applications-closed': { label: 'Applications closed', live: false },
  'pre-announcement': { label: 'Opens soon', live: false },
  ended: { label: 'Ended', live: false },
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const official = await getOfficialSchedules();
  const event = getEventBySlug(slug, new Date(), official) ?? getCurrentEditionForProgram(slug, new Date(), official);

  if (!event) {
    return new ImageResponse(
      (
        <Card
          title="Programs & deadlines"
          detail="GSoC, GSSoC, Hacktoberfest, Outreachy, LFX and more"
          footer="Application windows and countdowns"
        />
      ),
      { ...size }
    );
  }

  const deadline = event.nextDeadline;
  const detail = deadline
    ? `${deadline.label} · ${formatDeadlineDate(deadline.date)} · ${daysLeft(deadline.date)}`
    : `Ended ${formatDeadlineDate(event.contributionEnd)}`;

  return new ImageResponse(
    (
      <Card
        title={event.name}
        subtitle={getCohortLabel(event)}
        detail={detail}
        footer={`Organized by ${event.organizer}`}
        status={STATUS_LABEL[event.phase ?? 'pre-announcement']}
      />
    ),
    { ...size }
  );
}
