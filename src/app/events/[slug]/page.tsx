import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import type { ContributionEvent } from '@/types';
import {
  buildCalendarLinks,
  formatDeadlineDate,
  getAllEvents,
  type OfficialSchedules,
  getCohortLabel,
  getCurrentEditionForProgram,
  getEventBySlug,
} from '@/lib/events';
import { datesBasis, phaseDisplay, programMonogram, PROGRAM_TYPE_LABEL } from '@/lib/program-display';
import { getOfficialSchedules } from '@/lib/programs.server';
import { getProgramDirectory } from '@/lib/program-directory';
import { getSiteUrl } from '@/lib/site';
import Countdown from '@/components/Countdown';
import { RepoRowSkeleton } from '@/components/RepoRow';
import { ButtonAnchor, ButtonLink } from '@/components/ui/Button';
import { Notice, Panel, SectionHead, StatusDot, Tag } from '@/components/ui/primitives';
import { IconArrowLeft, IconArrowUpRight, IconCalendar, IconChevronRight } from '@/components/icons';
import rows from '@/components/rows.module.css';
import { editionShortTitle, editionTitle, formatStipend, hostOf, sortPrograms, todayISO } from '../program-format';
import CalendarMenu from './CalendarMenu';
import LfxMentorships from './LfxMentorships';
import ParticipatingOrganizations, { discoverHref, ORGANIZATION_LABELS } from './ParticipatingOrganizations';
import ProgramIssues, { programIssueQuery } from './ProgramIssues';
import ProgramRepos, { programRepoQuery } from './ProgramRepos';
import styles from './page.module.css';

export const revalidate = 3600;

interface ProgramPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const official = await getOfficialSchedules();
  return getAllEvents(new Date(), official).map(event => ({ slug: event.slug }));
}

type Resolved =
  | { kind: 'edition'; event: ContributionEvent; current?: ContributionEvent }
  | { kind: 'program'; current: ContributionEvent }
  | { kind: 'missing' };

/** An edition slug ("gsoc-2027"), a bare program key ("gsoc") or nothing we know. */
function resolve(slug: string, now: Date, official: OfficialSchedules): Resolved {
  const event = getEventBySlug(slug, now, official);
  if (event) return { kind: 'edition', event, current: getCurrentEditionForProgram(event.programKey, now, official) };
  const current = getCurrentEditionForProgram(slug, now, official);
  return current ? { kind: 'program', current } : { kind: 'missing' };
}

export async function generateMetadata({ params }: ProgramPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolve(slug, new Date(), await getOfficialSchedules());
  if (resolved.kind === 'missing') return { title: 'Program not found', robots: { index: false } };

  const event = resolved.kind === 'edition' ? resolved.event : resolved.current;
  const title = editionTitle(event);
  return {
    title,
    description: event.description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      type: 'website',
      siteName: 'Orion',
      title,
      description: event.description,
      url: `/events/${event.slug}`,
    },
  };
}

const PREPARATION = [
  {
    title: 'Read the rules and eligibility',
    body: 'Requirements, time commitment and stipend terms can change between editions, so start with the official guidelines.',
  },
  {
    title: 'Shortlist two or three organizations',
    body: 'Pick projects whose stack you already use, then read their contributing guides and recent issues.',
  },
  {
    title: 'Make a first contribution before you apply',
    body: 'A small merged fix or docs change shows maintainers you can already work in their codebase.',
  },
  {
    title: 'Draft your application early',
    body: 'Share it with mentors or maintainers and ask for feedback while there is still time to act on it.',
  },
  {
    title: 'Set a reminder for the deadline',
    body: 'Put it in your calendar with a few days of margin. Deadlines are strict and time zones catch people out.',
  },
];

interface Milestone {
  label: string;
  date: string;
}

function keyDates(event: ContributionEvent): Milestone[] {
  const milestones: Milestone[] = [];
  if (event.applicationStart) milestones.push({ label: 'Applications open', date: event.applicationStart });
  if (event.applicationDeadline) milestones.push({ label: 'Application deadline', date: event.applicationDeadline });
  milestones.push({ label: 'Program starts', date: event.contributionStart });
  milestones.push({ label: 'Program ends', date: event.contributionEnd });
  // Official extras: results days, final deadlines, announcements.
  milestones.push(...(event.milestones ?? []));
  // Stable sort: same-day milestones keep the order above.
  return milestones.sort((a, b) => a.date.localeCompare(b.date));
}

/** Programs whose contributions happen on GitHub issues carrying the program's label. */
const ISSUE_LABELS: Record<string, string> = {
  hacktoberfest: 'hacktoberfest',
  gssoc: 'gssoc',
  swoc: 'swoc',
};

function formatApprox(value: number, noun: string) {
  return `About ${value.toLocaleString('en-US')} ${noun}`;
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { slug } = await params;
  const now = new Date();
  const [official, directory] = await Promise.all([getOfficialSchedules(), getProgramDirectory()]);
  const resolved = resolve(slug, now, official);
  if (resolved.kind === 'program') redirect(`/events/${resolved.current.slug}`);
  if (resolved.kind === 'missing') notFound();

  const { event, current } = resolved;
  // The community program list keeps stipends and eligibility current.
  const listed = directory.programs.find(program => program.programKey === event.programKey);
  const today = todayISO(now);
  const cohort = getCohortLabel(event);
  const phase = phaseDisplay(event);
  const basis = datesBasis(event);
  const host = hostOf(event.website);
  const ended = event.status === 'ended';
  const successor = current && current.slug !== event.slug ? current : undefined;

  const milestones = keyDates(event);
  const nextDate = milestones.find(milestone => milestone.date >= today)?.date;

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/events/${event.slug}`;
  const deadline = event.nextDeadline;
  const calendar = deadline
    ? buildCalendarLinks(
        `${editionTitle(event)}: ${deadline.label}`,
        deadline.date,
        `${event.description}\n\n${datesBasis(event).sentence} Confirm on ${host}.\n${pageUrl}`
      )
    : null;

  const orgLabel = ORGANIZATION_LABELS[event.programKey];
  const issueLabel = ISSUE_LABELS[event.programKey];
  // This season's issues once the edition is under way; the latest ones before that.
  const issuesSince = event.status === 'upcoming' ? undefined : (event.applicationStart ?? event.contributionStart);
  const otherPrograms = sortPrograms(getAllEvents(now, official))
    .filter(program => program.programKey !== event.programKey)
    .slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: editionTitle(event),
    description: event.description,
    url: pageUrl,
    startDate: event.contributionStart,
    endDate: event.contributionEnd,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', url: event.website },
    organizer: { '@type': 'Organization', name: event.organizer, url: event.website },
    image: [`${pageUrl}/opengraph-image`],
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <ButtonLink href="/events" variant="ghost" size="sm" className={styles.back}>
        <IconArrowLeft size={14} />
        Programs
      </ButtonLink>

      {successor && (
        <Notice
          className={styles.notice}
          icon={<IconCalendar size={15} />}
          action={
            <ButtonLink href={`/events/${successor.slug}`} variant="secondary" size="sm">
              View {editionShortTitle(successor)}
            </ButtonLink>
          }
        >
          {ended
            ? `This edition has ended. The next one is ${editionTitle(successor)}.`
            : `This is a later edition. The current one is ${editionTitle(successor)}.`}
        </Notice>
      )}

      <header className={styles.header}>
        <span className={styles.monogram} aria-hidden="true">
          {programMonogram(event)}
        </span>
        <div className={styles.headerText}>
          <span className="eyebrow">{event.organizer}</span>
          <h1 className={styles.title}>
            {event.name}
            {cohort && <span className={styles.cohort}> {cohort}</span>}
          </h1>
          <div className={styles.meta}>
            <StatusDot tone={phase.tone} live={phase.live}>
              {phase.label}
            </StatusDot>
            <span className={styles.tags}>
              <Tag tone={event.isPaid ? 'accent' : 'muted'}>{event.isPaid ? 'Paid' : 'Unpaid'}</Tag>
              <Tag tone="muted">Remote</Tag>
              <Tag tone="muted">{PROGRAM_TYPE_LABEL[event.type]}</Tag>
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <ButtonAnchor href={event.applicationUrl || event.website} variant="primary">
            {ended || !event.applicationDeadline ? 'Visit the official site' : 'Apply on the official site'}
            <IconArrowUpRight size={14} />
          </ButtonAnchor>
          {calendar && deadline && (
            <CalendarMenu
              googleUrl={calendar.googleUrl}
              icsDataUri={calendar.icsDataUri}
              fileName={`${event.slug}-${deadline.label.toLowerCase().replace(/\s+/g, '-')}.ics`}
              milestone={deadline.label}
              date={formatDeadlineDate(deadline.date)}
            />
          )}
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section aria-labelledby="key-dates">
            <SectionHead title="Key dates" id="key-dates" />
            <Panel className={styles.tablePanel}>
              <table className={styles.dates}>
                <caption className={styles.caption}>
                  {basis.kind === 'official' ? (
                    <>
                      Official dates, synced from{' '}
                      <a href={basis.url} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                        {hostOf(basis.url)}
                      </a>
                      .
                    </>
                  ) : basis.kind === 'usual' ? (
                    <>
                      Generated from the program&rsquo;s usual timeline. Confirm on{' '}
                      <a href={event.website} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                        {host}
                      </a>
                      .
                    </>
                  ) : (
                    <>
                      {basis.sentence} Source:{' '}
                      <a href={basis.url} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                        {hostOf(basis.url)}
                      </a>
                      . Confirm on{' '}
                      <a href={event.website} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                        {host}
                      </a>
                      .
                    </>
                  )}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Milestone</th>
                    <th scope="col">Date</th>
                    <th scope="col" className={styles.statusCol}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map(milestone => {
                    const passed = milestone.date < today;
                    const next = milestone.date === nextDate;
                    return (
                      <tr key={`${milestone.label}-${milestone.date}`} className={passed ? styles.passed : undefined}>
                        <th scope="row">{milestone.label}</th>
                        <td>
                          <time dateTime={milestone.date} className={styles.date}>
                            {formatDeadlineDate(milestone.date)}
                          </time>
                        </td>
                        <td className={styles.statusCol}>
                          {passed ? (
                            <span className={styles.statusMuted}>Passed</span>
                          ) : next ? (
                            <span className={styles.statusNext}>
                              <span className={styles.nextDot} aria-hidden="true" />
                              <span className="visually-hidden">Next, time left: </span>
                              <Countdown date={milestone.date} format="short" />
                            </span>
                          ) : (
                            <span className={styles.statusUpcoming}>Upcoming</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          </section>

          <section aria-labelledby="about">
            <SectionHead title="About" id="about" />
            <div className={styles.prose}>
              {(event.longDescription || event.description).split('\n\n').map(paragraph => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section aria-labelledby="prepare">
            <SectionHead title="How to prepare" id="prepare" />
            <ol className={styles.steps} role="list">
              {PREPARATION.map((step, index) => (
                <li key={step.title} className={styles.step}>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className={styles.stepText}>
                    <p className={styles.stepTitle}>{step.title}</p>
                    <p className={styles.stepBody}>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {event.programKey === 'lfx-mentorship' && event.editionYear && (
            <section aria-labelledby="mentorships">
              <SectionHead title="Open mentorships" id="mentorships" href="https://mentorship.lfx.linuxfoundation.org" linkLabel="All on LFX" external />
              <Suspense fallback={<RepoRowSkeleton count={4} />}>
                <LfxMentorships year={event.editionYear} cohort={cohort} />
              </Suspense>
            </section>
          )}

          {issueLabel && (
            <section aria-labelledby="program-issues">
              <SectionHead
                title="Issues to pick up"
                id="program-issues"
                href={`https://github.com/search?type=issues&q=${encodeURIComponent(programIssueQuery(issueLabel, issuesSince))}`}
                linkLabel="All on GitHub"
                external
              />
              <Suspense fallback={<RepoRowSkeleton count={4} />}>
                <ProgramIssues label={issueLabel} since={issuesSince} />
              </Suspense>
            </section>
          )}

          {issueLabel && (
            <section aria-labelledby="program-repos">
              <SectionHead
                title="Participating repositories"
                id="program-repos"
                href={`https://github.com/search?type=repositories&s=updated&q=${encodeURIComponent(programRepoQuery(issueLabel))}`}
                linkLabel="All on GitHub"
                external
              />
              <Suspense fallback={<RepoRowSkeleton count={3} />}>
                <ProgramRepos topic={issueLabel} />
              </Suspense>
            </section>
          )}

          {orgLabel && (
            <section aria-labelledby="organizations">
              <SectionHead
                title="Participating organizations"
                id="organizations"
                href={discoverHref(orgLabel)}
                linkLabel="Browse in Discover"
              />
              <p className={styles.sectionCaption}>From past rosters; the current list is published by the program.</p>
              <Suspense fallback={<RepoRowSkeleton count={4} />}>
                <ParticipatingOrganizations label={orgLabel} />
              </Suspense>
            </section>
          )}
        </div>

        <aside className={styles.aside} aria-label="Program details">
          <Panel className={styles.facts}>
            <dl className={styles.factList}>
              <div className={styles.fact}>
                <dt>Organizer</dt>
                <dd>{event.organizer}</dd>
              </div>
              <div className={styles.fact}>
                <dt>Format</dt>
                <dd>{event.isRemote ? 'Remote' : 'In person'}</dd>
              </div>
              <div className={styles.fact}>
                <dt>Stipend</dt>
                <dd>{(event.isPaid && listed?.reward) || formatStipend(event)}</dd>
              </div>
              {listed?.eligibility && (
                <div className={styles.fact}>
                  <dt>Who can apply</dt>
                  <dd>{listed.eligibility}</dd>
                </div>
              )}
              {event.cohortsNote && (
                <div className={styles.fact}>
                  <dt>Cohorts</dt>
                  <dd>{event.cohortsNote}</dd>
                </div>
              )}
              {(event.participatingOrgs || event.totalContributors) ? (
                <div className={styles.fact}>
                  <dt>Scale</dt>
                  <dd>
                    {event.participatingOrgs ? (
                      <span className={styles.factLine}>{formatApprox(event.participatingOrgs, 'organizations')}</span>
                    ) : null}
                    {event.totalContributors ? (
                      <span className={styles.factLine}>{formatApprox(event.totalContributors, 'contributors')}</span>
                    ) : null}
                    <span className={styles.factNote}>Approximate, from past editions</span>
                  </dd>
                </div>
              ) : null}
              <div className={styles.fact}>
                <dt>Website</dt>
                <dd>
                  <a href={event.website} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                    {host}
                    <IconArrowUpRight size={13} />
                  </a>
                </dd>
              </div>
            </dl>
          </Panel>

          {otherPrograms.length > 0 && (
            <section aria-labelledby="other-programs">
              <SectionHead title="Other programs" id="other-programs" />
              <ul className={rows.list}>
                {otherPrograms.map(program => (
                  <li key={program.slug} className={styles.otherItem}>
                    <Link href={`/events/${program.slug}`} className={styles.otherLink}>
                      <span className={styles.otherText}>
                        <span className={styles.otherName}>{editionTitle(program)}</span>
                        {program.nextDeadline && (
                          <span className={styles.otherMeta}>
                            {program.nextDeadline.label}{' '}
                            <time dateTime={program.nextDeadline.date} className={styles.date}>
                              {formatDeadlineDate(program.nextDeadline.date)}
                            </time>
                          </span>
                        )}
                      </span>
                      <IconChevronRight size={14} className={styles.otherChevron} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
