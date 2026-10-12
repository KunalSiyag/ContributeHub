import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { buildIssueQuery, describeReset, getGoodFirstIssues, GitHubError } from '@/lib/github';
import { fetchBounties } from '@/lib/bounties.server';
import { computeBountyStats, featuredBounties as pickFeatured, isEstablished, type BountyIssue } from '@/lib/bounties';
import { formatDeadlineDate, getUpcomingDeadlines } from '@/lib/events';
import { getCurrentGsocProgram, getGsocOrganizations } from '@/lib/gsoc';
import { datesBasis } from '@/lib/program-display';
import { getOfficialSchedules } from '@/lib/programs.server';
import { getSiteUrl } from '@/lib/site';
import type { Issue } from '@/types';
import IssueRow from '@/components/IssueRow';
import BountyRow from '@/components/BountyRow';
import Countdown from '@/components/Countdown';
import RelativeTime from '@/components/RelativeTime';
import HeroActions from '@/components/home/HeroActions';
import OrionGlow from '@/components/home/OrionGlow';
import ProductPreview from '@/components/home/ProductPreview';
import FeatureTabs, { type FeatureTab } from '@/components/home/FeatureTabs';
import OrgMarquee from '@/components/home/OrgMarquee';
import Faq from '@/components/home/Faq';
import Beam from '@/components/fx/Beam';
import Frame from '@/components/fx/Frame';
import Reveal from '@/components/fx/Reveal';
import CountUp from '@/components/fx/CountUp';
import SectionLabel from '@/components/fx/SectionLabel';
import { StatusDot } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/Button';
import {
  IconActivity,
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconColumns,
  IconCompass,
  IconDollar,
  IconFileText,
} from '@/components/icons';
import rows from '@/components/rows.module.css';
import home from '@/components/home/home.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  openGraph: {
    title: 'Orion — the open source contributor workspace',
    description:
      'Find open source issues that match your stack, track them until the PR merges, and keep every program deadline in view.',
  },
};

// Live counts are cached for 15 minutes so the home page costs a handful of
// GitHub searches per quarter hour, regardless of traffic.
export const revalidate = 900;

const GOOD_FIRST_QUERY = buildIssueQuery({ preset: 'good-first' });

/** Position in the hero's entrance sequence (page.module.css → .intro). */
const intro = (order: number) => ({ '--i': order }) as CSSProperties;

function failureNote(reason: unknown) {
  if (reason instanceof GitHubError && reason.rateLimited) return `GitHub rate limit reached. Back ${describeReset(reason.resetAt)}.`;
  return 'GitHub did not respond. Try again shortly.';
}

/** Fetch and shape everything the page shows (kept out of render for purity). */
async function loadHome() {
  const [issuesResult, bountiesResult, official, gsoc] = await Promise.all([
    Promise.allSettled([getGoodFirstIssues(60)]).then(([r]) => r),
    Promise.allSettled([fetchBounties({ limit: 40 })]).then(([r]) => r),
    getOfficialSchedules(),
    getCurrentGsocProgram(),
  ]);
  const gsocOrgs = gsoc ? await getGsocOrganizations(gsoc.year) : [];

  // One issue per repository keeps the landing page varied.
  const seenRepos = new Set<string>();
  const issues: Issue[] = (issuesResult.status === 'fulfilled' ? issuesResult.value.items : []).filter(issue => {
    if (seenRepos.has(issue.repository_url)) return false;
    seenRepos.add(issue.repository_url);
    return true;
  });
  const issueTotal = issuesResult.status === 'fulfilled' ? issuesResult.value.total_count : null;
  // Bounties from new or unproven repositories (under 10 stars) stay out of the showcase and totals.
  const bounties: BountyIssue[] = bountiesResult.status === 'fulfilled' ? bountiesResult.value.bounties.filter(isEstablished) : [];
  const bountyStats = bountiesResult.status === 'fulfilled' ? computeBountyStats(bounties) : null;
  const withAmount = bounties.filter(b => b.bountyValue > 0).length;
  const freshCutoff = Date.now() - 90 * 86400000;
  const featuredBounties = pickFeatured(
    bounties.filter(b => b.assignees === 0 && new Date(b.updatedAt ?? b.createdAt).getTime() > freshCutoff)
  );

  const now = new Date();
  const deadlines = getUpcomingDeadlines(200, now, official).slice(0, 4);

  return {
    issuesResult,
    bountiesResult,
    issueTotal,
    bountyStats,
    withAmount,
    featuredBounties,
    deadlines,
    gsoc,
    gsocOrgs,
    day: Math.floor(now.getTime() / 86400000),
    generatedAt: now.toISOString(),
    boardIssues: issues.slice(0, 3),
    listIssues: issues.slice(3, 9),
  };
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className={home.checks}>
      {items.map(item => (
        <li key={item}>
          <span className={home.checkBox} aria-hidden="true">
            <IconCheck size={12} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function FeaturePanel({
  icon,
  tag,
  title,
  body,
  points,
  href,
  cta,
  visual,
}: {
  icon: ReactNode;
  tag: string;
  title: string;
  body: string;
  points: string[];
  href: string;
  cta: string;
  visual: ReactNode;
}) {
  return (
    <Frame className={home.panel} plain>
      <div className={home.panelCopy}>
        <span className={home.panelTag}>
          {icon}
          {tag}
        </span>
        <h3 className={home.panelTitle}>{title}</h3>
        <p className={home.panelBody}>{body}</p>
        <Checklist items={points} />
        <ButtonLink href={href} variant="primary" pill className={home.panelLink}>
          {cta} <IconArrowRight size={14} />
        </ButtonLink>
      </div>
      <div className={home.panelVisual}>{visual}</div>
    </Frame>
  );
}

export default async function Home() {
  const {
    issuesResult,
    bountiesResult,
    issueTotal,
    bountyStats,
    withAmount,
    featuredBounties,
    deadlines,
    gsoc,
    gsocOrgs,
    day,
    generatedAt,
    boardIssues,
    listIssues,
  } = await loadHome();

  const siteUrl = getSiteUrl();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Orion',
    url: siteUrl,
    description: 'Find open source issues that fit your stack, track them until they merge, and keep program deadlines in view.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/discover?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const next = deadlines[0];
  const pipeline = [
    { label: 'Saved', tone: 'var(--status-saved)', note: 'Issues you want to try' },
    { label: 'Working on it', tone: 'var(--status-working)', note: 'Assigned to you' },
    { label: 'PR open', tone: 'var(--status-review)', note: 'Waiting for review' },
    { label: 'Merged', tone: 'var(--status-done)', note: 'Shipped and counted' },
  ];

  const featureTabs: FeatureTab[] = [
    {
      id: 'discover',
      label: 'Discover',
      caption: 'Issues that fit',
      icon: <IconCompass size={16} />,
      panel: (
        <FeaturePanel
          icon={<IconCompass size={13} />}
          tag="Discover"
          title="Issues that fit your stack"
          body="Search every open GitHub issue labelled for newcomers. Add your languages once and each list ranks by how well it fits you."
          points={[
            'Good first issue, help wanted and unassigned presets',
            'Ranked by your languages, tools and interests',
            'Add any GitHub issue to your tracker by URL',
          ]}
          href="/discover"
          cta="Open Discover"
          visual={
            listIssues.length > 0 ? (
              <ul className={`${rows.list} ${home.visualList}`}>
                {listIssues.slice(0, 3).map(issue => (
                  <IssueRow key={issue.id} issue={issue} compact />
                ))}
              </ul>
            ) : (
              <p className={home.visualNote}>{failureNote(issuesResult.status === 'rejected' ? issuesResult.reason : null)}</p>
            )
          }
        />
      ),
    },
    {
      id: 'tracker',
      label: 'Tracker',
      caption: 'Saved to merged',
      icon: <IconColumns size={16} />,
      panel: (
        <FeaturePanel
          icon={<IconColumns size={13} />}
          tag="Tracker"
          title="Track every issue until it merges"
          body="Save issues from anywhere in Orion and move them across four columns. Notes, drag and drop and undo come built in."
          points={['Four columns, from saved to merged', 'Notes on every issue', 'Synced across your devices']}
          href="/issues"
          cta="Open your tracker"
          visual={
            <ol className={home.pipeline}>
              {pipeline.map(step => (
                <li key={step.label} className={home.pipelineStep}>
                  <span className={home.pipelineDot} style={{ background: step.tone }} aria-hidden="true" />
                  <span className={home.pipelineLabel}>{step.label}</span>
                  <span className={home.pipelineNote}>{step.note}</span>
                </li>
              ))}
            </ol>
          }
        />
      ),
    },
    {
      id: 'programs',
      label: 'Programs',
      caption: 'Deadlines',
      icon: <IconCalendar size={16} />,
      panel: (
        <FeaturePanel
          icon={<IconCalendar size={13} />}
          tag="Programs"
          title="Never miss a program deadline"
          body="GSoC, Outreachy, LFX, Hacktoberfest and more, each with its application window and a live countdown."
          points={['GSoC, LFX and Outreachy dates from the programs themselves', 'Countdowns for every application window', 'A directory of every other program, kept current']}
          href="/events"
          cta="See all programs"
          visual={
            <ol className={home.miniDeadlines}>
              {deadlines.slice(0, 3).map(({ event, deadline }) => (
                <li key={event.slug} className={home.miniDeadline}>
                  <span className={home.miniProgram}>{event.shortName}</span>
                  <span className={home.miniLabel}>{deadline.label}</span>
                  <span className={home.miniTime}>
                    <Countdown date={deadline.date} format="days" />
                  </span>
                </li>
              ))}
            </ol>
          }
        />
      ),
    },
    {
      id: 'bounties',
      label: 'Bounties',
      caption: 'Paid issues',
      icon: <IconDollar size={16} />,
      panel: (
        <FeaturePanel
          icon={<IconDollar size={13} />}
          tag="Bounties"
          title="Paid issues, unclaimed"
          body="Bounty-labelled issues and Algora rewards from across GitHub, filtered to the ones nobody has picked up yet."
          points={['Sorted by amount or freshness', 'Filter by language and source', 'Paid by maintainers; Orion never holds money']}
          href="/bounties"
          cta="Browse bounties"
          visual={
            featuredBounties.length > 0 ? (
              <ul className={`${rows.list} ${home.visualList}`}>
                {featuredBounties.slice(0, 2).map(bounty => (
                  <BountyRow key={bounty.id} bounty={bounty} />
                ))}
              </ul>
            ) : (
              <p className={home.visualNote}>{failureNote(bountiesResult.status === 'rejected' ? bountiesResult.reason : null)}</p>
            )
          }
        />
      ),
    },
    {
      id: 'resume',
      label: 'Resume match',
      caption: 'Skills to issues',
      icon: <IconFileText size={16} />,
      panel: (
        <FeaturePanel
          icon={<IconFileText size={13} />}
          tag="Resume match"
          title="Turn your resume into matches"
          body="Drop a PDF or DOCX. Orion reads your languages and tools, lets you review them, then ranks open issues by fit."
          points={['Read in memory, never stored', 'AI extraction catches what keywords miss', 'Review skills before anything is saved']}
          href="/resume"
          cta="Match my resume"
          visual={
            <div className={home.resumeVisual}>
              <span className={home.resumeFile}>
                <IconFileText size={14} /> resume.pdf
              </span>
              <span className={home.resumeArrow} aria-hidden="true" />
              <span className={home.resumeChips}>
                {['TypeScript', 'Go', 'React', 'Docker', 'PostgreSQL'].map(skill => (
                  <span key={skill} className={home.resumeChip}>
                    {skill}
                  </span>
                ))}
              </span>
              <span className={home.resumeResult}>
                <IconCheck size={13} /> Issues ranked by fit
              </span>
            </div>
          }
        />
      ),
    },
    {
      id: 'overview',
      label: 'Overview',
      caption: 'Your progress',
      icon: <IconActivity size={16} />,
      panel: (
        <FeaturePanel
          icon={<IconActivity size={13} />}
          tag="Overview"
          title="Your progress at a glance"
          body="One page with your pipeline, recent pull requests, merged totals, contribution calendar and the deadlines that matter."
          points={['Pull requests and merged totals from GitHub', 'Your contribution calendar', 'Recommendations ranked by your skills']}
          href="/dashboard"
          cta="Open your overview"
          visual={
            <div className={home.heatVisual} aria-hidden="true">
              {Array.from({ length: 84 }, (_, i) => (
                <i key={i} style={{ background: `var(--heat-${[0, 1, 0, 2, 3, 1, 0, 4, 2, 0, 1, 3][(i * 7 + (i % 5)) % 12]})` }} />
              ))}
            </div>
          }
        />
      ),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ---------------- Hero ---------------- */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroBackdrop} aria-hidden="true">
          <div className={`grid-bg ${styles.heroGrid}`} />
          <div className={styles.heroGlow} />
          <OrionGlow starfield className={styles.heroOrion} />
        </div>

        <div className={`container ${styles.heroInner}`}>
          <Link href="/discover" className={`${styles.livePill} ${styles.intro}`} style={intro(0)}>
            <span className={styles.liveTag}>
              <i aria-hidden="true" />
              Live
            </span>
            {issueTotal !== null ? (
              <span>
                <span className="tabular">{issueTotal.toLocaleString('en-US')}</span> good first issues open on GitHub
              </span>
            ) : (
              <span>Good first issues from across GitHub</span>
            )}
            <IconArrowRight size={12} />
          </Link>

          <h1 id="hero-title" className={`${styles.heroTitle} ${styles.intro}`} style={intro(1)}>
            From good first issue to <span className={styles.accentText}>merged pull request</span>.
          </h1>
          <p className={`${styles.heroLead} ${styles.intro}`} style={intro(2)}>
            Orion finds open source issues that fit your stack, tracks each one until it merges, and keeps every program
            deadline, from GSoC to Hacktoberfest, in view.
          </p>
          <div className={`${styles.heroActions} ${styles.intro}`} style={intro(3)}>
            <HeroActions />
          </div>
          <ul className={`${styles.heroFacts} ${styles.intro}`} style={intro(4)}>
            <li>
              <IconCheck size={13} /> Free to use
            </li>
            <li>
              <IconCheck size={13} /> Reads public data only
            </li>
            <li>
              <IconCheck size={13} /> Sign in with GitHub or Google
            </li>
          </ul>
        </div>

        <div className={`container ${styles.intro}`} style={intro(5)}>
          <ProductPreview issues={boardIssues} />
        </div>
      </section>

      {/* ---------------- Live figures ---------------- */}
      <section className="container" aria-labelledby="figures-title">
        <h2 id="figures-title" className="visually-hidden">
          Live figures
        </h2>
        <Reveal>
          <Frame className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{issueTotal !== null ? <CountUp value={issueTotal} /> : '–'}</span>
              <span className={styles.statLabel}>open, unassigned good first issues</span>
              <code className={styles.statQuery}>
                <span aria-hidden="true">› </span>
                {GOOD_FIRST_QUERY}
              </code>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{bountyStats ? <CountUp value={bountyStats.totalPool} prefix="$" /> : '–'}</span>
              <span className={styles.statLabel}>stated across {withAmount} open bounties</span>
              <code className={styles.statQuery}>
                <span aria-hidden="true">› </span>label:bounty, Algora rewards
              </code>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{gsocOrgs.length > 0 ? <CountUp value={gsocOrgs.length} /> : '–'}</span>
              <span className={styles.statLabel}>organizations in Google Summer of Code {gsoc?.year ?? ''}</span>
              <code className={styles.statQuery}>
                <span aria-hidden="true">› </span>official list from Google
              </code>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{next ? <Countdown date={next.deadline.date} format="days" /> : '–'}</span>
              <span className={styles.statLabel}>
                {next ? (
                  <>
                    until {next.event.shortName} {next.deadline.label.toLowerCase()}
                  </>
                ) : (
                  'no deadlines soon'
                )}
              </span>
              <code className={styles.statQuery}>
                <span aria-hidden="true">› </span>next program deadline
              </code>
            </div>
            <p className={styles.statsFoot}>
              <StatusDot tone="done" live>
                Live from GitHub and Google
              </StatusDot>
              <span>
                Updated <RelativeTime date={generatedAt} />
              </span>
            </p>
          </Frame>
        </Reveal>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className={`container ${styles.section}`} aria-labelledby="features-title">
        <Reveal className={styles.sectionHead}>
          <SectionLabel>Features</SectionLabel>
          <h2 id="features-title" className={styles.heading} data-split>
            What you can do in Orion
          </h2>
          <p className={styles.lead}>Six tools in one workspace. Pick one to see what it does.</p>
        </Reveal>
        <Reveal>
          <FeatureTabs tabs={featureTabs} />
        </Reveal>
      </section>

      {/* ---------------- Programs ---------------- */}
      <section className={`container ${styles.section}`} aria-labelledby="programs-title">
        <Reveal className={styles.sectionHead}>
          <SectionLabel>Programs</SectionLabel>
          <h2 id="programs-title" className={styles.heading} data-split>
            Every program, counting down
          </h2>
          <p className={styles.lead}>
            Countdowns for the big programs, with dates read from GSoC, LFX and Outreachy themselves, and a directory of every
            other program that updates on its own.
          </p>
        </Reveal>

        <ol className={styles.programs}>
          {deadlines.map(({ event, deadline }, index) => (
            <Reveal as="li" key={event.slug} delay={index * 80}>
              <Link
                href={`/events/${event.slug}`}
                className={[styles.program, index === 0 && 'fx-glow'].filter(Boolean).join(' ')}
                data-spotlight
              >
                {index === 0 && <Beam />}
                <span className={styles.programTop}>
                  <span className="eyebrow">{event.shortName}</span>
                  {datesBasis(event).badge && <span className={styles.official}>{datesBasis(event).badge}</span>}
                </span>
                <span className={styles.programLabel}>{deadline.label}</span>
                <span className={styles.programTime}>
                  <Countdown date={deadline.date} />
                </span>
                <span className={styles.programDate}>{formatDeadlineDate(deadline.date)}</span>
              </Link>
            </Reveal>
          ))}
        </ol>

        {gsoc && gsocOrgs.length > 0 && (
          <Reveal className={styles.orgs}>
            <p className={styles.orgsLabel}>
              Mentoring in Google Summer of Code {gsoc.year}
              <span aria-hidden="true"> · </span>
              <a href={`https://summerofcode.withgoogle.com/programs/${gsoc.year}/organizations`} target="_blank" rel="noopener noreferrer">
                Official list <IconArrowRight size={12} />
              </a>
            </p>
            <OrgMarquee orgs={gsocOrgs} year={gsoc.year} day={day} />
          </Reveal>
        )}

        <div className={styles.sectionFoot}>
          <Link href="/events" className={styles.textLink}>
            See every program and the year at a glance <IconArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ---------------- Live now ---------------- */}
      <section className={`container ${styles.section}`} aria-labelledby="live-title">
        <Reveal className={styles.sectionHead}>
          <SectionLabel>Live now</SectionLabel>
          <h2 id="live-title" className={styles.heading} data-split>
            Fresh issues and open bounties
          </h2>
          <p className={styles.lead}>Straight from GitHub, newest first. Track any of them to start your board.</p>
        </Reveal>
        <div className={styles.liveGrid}>
          <Reveal>
            <Frame className={styles.livePanel}>
              <div className={styles.livePanelHead}>
                <span className="eyebrow">Good first issues</span>
                <Link href="/discover" className={styles.textLink}>
                  Discover <IconArrowRight size={14} />
                </Link>
              </div>
              {listIssues.length > 0 ? (
                <ul className={rows.list}>
                  {listIssues.map(issue => (
                    <IssueRow key={issue.id} issue={issue} />
                  ))}
                </ul>
              ) : (
                <p className={styles.unavailable}>{failureNote(issuesResult.status === 'rejected' ? issuesResult.reason : null)}</p>
              )}
            </Frame>
          </Reveal>
          <Reveal delay={120}>
            <Frame className={styles.livePanel}>
              <div className={styles.livePanelHead}>
                <span className="eyebrow">Unclaimed bounties</span>
                <Link href="/bounties" className={styles.textLink}>
                  All bounties <IconArrowRight size={14} />
                </Link>
              </div>
              {featuredBounties.length > 0 ? (
                <ul className={rows.list}>
                  {featuredBounties.map(bounty => (
                    <BountyRow key={bounty.id} bounty={bounty} />
                  ))}
                </ul>
              ) : (
                <p className={styles.unavailable}>{failureNote(bountiesResult.status === 'rejected' ? bountiesResult.reason : null)}</p>
              )}
              <p className={styles.panelNote}>Maintainers pay bounties on their own platforms. Orion finds them; it never holds money.</p>
            </Frame>
          </Reveal>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className={`container ${styles.section}`} aria-labelledby="faq-title">
        <Reveal className={styles.sectionHead}>
          <SectionLabel>FAQ</SectionLabel>
          <h2 id="faq-title" className={styles.heading} data-split>
            Questions, answered
          </h2>
        </Reveal>
        <Reveal>
          <Faq />
        </Reveal>
      </section>

      {/* ---------------- Closing ---------------- */}
      <section className={`container ${styles.section}`} aria-labelledby="closing-title">
        <Reveal>
          <Frame className={styles.closing}>
            <div className={styles.closingCopy}>
              <h2 id="closing-title" className={styles.closingTitle} data-split>
                Start with one issue.
              </h2>
              <p className={styles.lead}>Sign in once. Your tracker, skills and saved repositories follow you across devices.</p>
              <div className={styles.closingActions}>
                <HeroActions size="md" />
              </div>
            </div>
            <div className={styles.closingArt} aria-hidden="true">
              <div className={styles.closingGlow} />
              <OrionGlow id="orion-closing" className={styles.closingOrion} />
            </div>
          </Frame>
        </Reveal>
      </section>
    </>
  );
}
