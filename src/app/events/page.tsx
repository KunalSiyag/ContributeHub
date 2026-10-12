import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDeadlineDate, getAllEvents, getUpcomingDeadlines } from '@/lib/events';
import { getOfficialSchedules } from '@/lib/programs.server';
import { DIRECTORY_URL, getProgramDirectory } from '@/lib/program-directory';
import ProgramRow from '@/components/ProgramRow';
import Countdown from '@/components/Countdown';
import Beam from '@/components/fx/Beam';
import { ButtonAnchor } from '@/components/ui/Button';
import { EmptyState, PageHeader, SectionHead } from '@/components/ui/primitives';
import { IconChevronRight, IconRss } from '@/components/icons';
import rows from '@/components/rows.module.css';
import { datesBasis } from '@/lib/program-display';
import { getSiteUrl } from '@/lib/site';
import ProgramDirectory, { type DirectoryEntry } from './ProgramDirectory';
import SubscribeCalendar from './SubscribeCalendar';
import YearTimeline, { timelineRange } from './YearTimeline';
import { editionTitle, sortPrograms, todayISO } from './program-format';
import styles from './page.module.css';

export const revalidate = 3600;

const description =
  'Application windows, program dates and countdowns for GSoC, GSSoC, Hacktoberfest, Outreachy, LFX Mentorship, MLH Fellowship and more open source programs.';

export const metadata: Metadata = {
  title: 'Programs & deadlines',
  description,
  alternates: { canonical: '/events' },
  openGraph: { type: 'website', siteName: 'Orion', title: 'Programs & deadlines', description, url: '/events' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function EventsPage() {
  const now = new Date();
  const today = todayISO(now);
  const [official, directory] = await Promise.all([getOfficialSchedules(), getProgramDirectory()]);
  const programs = sortPrograms(getAllEvents(now, official));
  const trackedSlug = new Map(programs.map(program => [program.programKey, program.slug]));
  const directoryEntries: DirectoryEntry[] = directory.programs.map(program => {
    const next = program.events.find(event => (event.endDate ?? event.date) >= today);
    return {
      name: program.name,
      url: program.url,
      organization: program.organization,
      timeline: program.timeline,
      reward: program.reward,
      eligibility: program.eligibility,
      kind: program.kind,
      paid: program.paid,
      trackedHref: program.programKey && trackedSlug.has(program.programKey) ? `/events/${trackedSlug.get(program.programKey)}` : null,
      next: next ? { date: next.date, label: next.label, display: formatDeadlineDate(next.date) } : null,
    };
  });
  const deadlines = getUpcomingDeadlines(120, now, official).slice(0, 6);
  const [featured, ...upcoming] = deadlines;
  const range = timelineRange(now);

  return (
    <>
      <PageHeader
        eyebrow="Programs"
        title="Programs & deadlines"
        description="GSoC, LFX and Outreachy dates come straight from the programs themselves; the rest follow their usual schedule and roll forward on their own. Below them, a directory of every other program, kept current from a community list. Confirm on the official site before you apply."
        actions={
          <>
            <SubscribeCalendar siteUrl={getSiteUrl()} />
            <ButtonAnchor href="/feed.xml" variant="secondary" target="_self" rel="alternate" type="application/rss+xml">
              <IconRss size={14} />
              RSS
            </ButtonAnchor>
          </>
        }
      />

      <div className={styles.sections}>
        <section aria-labelledby="next-deadlines">
          <SectionHead title="Next deadlines" id="next-deadlines" />
          {featured ? (
            <div className={styles.deadlinesGrid}>
              <Link
                href={`/events/${featured.event.slug}`}
                className={`${styles.featured} fx-glow`}
                data-spotlight
                aria-label={`Next up: ${editionTitle(featured.event)}, ${featured.deadline.label}, ${formatDeadlineDate(featured.deadline.date)}`}
              >
                <Beam />
                <span className={styles.featuredTop}>
                  <span className="eyebrow">Next up</span>
                  {datesBasis(featured.event).badge && <span className={styles.official}>{datesBasis(featured.event).badge}</span>}
                </span>
                <span className={styles.featuredName}>{editionTitle(featured.event)}</span>
                <span className={styles.featuredLabel}>
                  {featured.deadline.label} · {formatDeadlineDate(featured.deadline.date)}
                </span>
                <Countdown date={featured.deadline.date} className={styles.featuredCountdown} />
              </Link>
              {upcoming.length > 0 && (
                <ul className={rows.list}>
                  {upcoming.map(({ event, deadline }) => {
                    const [, month, day] = deadline.date.split('-').map(Number);
                    const title = editionTitle(event);
                    return (
                      <li key={`${event.slug}-${deadline.label}`} className={styles.deadlineItem} data-spotlight="wash">
                        <Link
                          href={`/events/${event.slug}`}
                          className={styles.deadline}
                          aria-label={`${title}: ${deadline.label}, ${formatDeadlineDate(deadline.date)}`}
                        >
                          <time
                            dateTime={deadline.date}
                            className={[styles.dateBlock, deadline.date === today && styles.dateToday]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <span className={styles.dateMonth}>{MONTHS[month - 1]}</span>
                            <span className={styles.dateDay}>{day}</span>
                          </time>
                          <span className={styles.deadlineText}>
                            <span className={styles.deadlineName}>{title}</span>
                            <span className={styles.deadlineLabel}>{deadline.label}</span>
                          </span>
                          <Countdown date={deadline.date} format="short" className={styles.deadlineCountdown} />
                          <IconChevronRight size={14} className={styles.deadlineChevron} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className={rows.list}>
              <EmptyState title="No deadlines in the next 120 days">
                Every program below is between editions. Check back as the next application windows approach.
              </EmptyState>
            </div>
          )}
        </section>

        <section aria-labelledby="year-at-a-glance">
          <SectionHead title="Year at a glance" count={range.label} id="year-at-a-glance" />
          <YearTimeline programs={programs} now={now} official={official} />
        </section>

        <section aria-labelledby="all-programs">
          <SectionHead title="Tracked programs" count={programs.length} id="all-programs" />
          <ul className={rows.list}>
            {programs.map(event => (
              <ProgramRow key={event.slug} event={event} />
            ))}
          </ul>
        </section>

        {directoryEntries.length > 0 && (
          <section aria-labelledby="directory">
            <SectionHead title="Program directory" count={directoryEntries.length} id="directory" />
            <ProgramDirectory entries={directoryEntries} />
            <p className={styles.directoryNote}>
              From the community-maintained{' '}
              <a href={DIRECTORY_URL} target="_blank" rel="noopener noreferrer">
                List of Open Source Programs
              </a>{' '}
              (Apache-2.0), refreshed every few hours, so new programs appear here on their own. Confirm details on each
              program&rsquo;s site.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
