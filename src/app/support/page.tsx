import type { Metadata } from 'next';
import Link from 'next/link';
import { REPO_URL, sponsorUrl } from '@/lib/site';
import { ButtonAnchor } from '@/components/ui/Button';
import { PageHeader, Panel } from '@/components/ui/primitives';
import { IconArrowUpRight, IconGithub, IconHeart } from '@/components/icons';
import styles from './support.module.css';

export const metadata: Metadata = {
  title: 'Support Orion',
  description: 'Orion is free, with no paid plan. Here is how to help it keep going.',
  alternates: { canonical: '/support' },
};

/** Things tools like Orion often charge for, or keep behind an account. */
const FREE = [
  ['Alerts', 'Saved searches with browser notifications, RSS and daily email.', '/alerts'],
  ['Repository reports', 'Review speed, merge rate and starter issues for any repository, and comparisons.', '/repos'],
  ['Assistant', 'Explains repositories and answers program questions.', '/assistant'],
  ['Repo bot', 'Welcome messages, thank-yous and slash commands for maintainers.', '/repo-bot'],
  ['Programs and bounties', 'Deadlines from the programs themselves, as a calendar and RSS.', '/events'],
  ['API and MCP server', 'The same data for your own tools and AI agents.', '/llms.txt'],
] as const;

export default function SupportPage() {
  const sponsor = sponsorUrl();

  return (
    <>
      <PageHeader
        eyebrow="Project"
        title="Support Orion"
        description="Orion is free: every feature, for everyone, with no paid plan and nothing held back for sponsors. If it helped you find your way into open source, here is how to help it."
        actions={
          sponsor ? (
            <ButtonAnchor href={sponsor} variant="primary">
              <IconHeart size={14} />
              Sponsor Orion
            </ButtonAnchor>
          ) : (
            <ButtonAnchor href={REPO_URL} variant="primary">
              <IconGithub size={14} />
              Star on GitHub
            </ButtonAnchor>
          )
        }
      />

      <div className={styles.layout}>
        <section aria-labelledby="support-ways">
          <h2 id="support-ways" className={styles.heading}>
            Ways to help
          </h2>
          <Panel as="ul" className={styles.ways}>
            {sponsor && (
              <li>
                <a href={sponsor} target="_blank" rel="noopener noreferrer" className={styles.way}>
                  <span className={styles.wayTitle}>Sponsor development</span>
                  <span className={styles.wayText}>Pays for the GitHub and AI quota behind live data and the assistant.</span>
                  <IconArrowUpRight size={14} className={styles.wayIcon} />
                </a>
              </li>
            )}
            <li>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={styles.way}>
                <span className={styles.wayTitle}>Star the repository</span>
                <span className={styles.wayText}>Stars help other contributors find Orion.</span>
                <IconArrowUpRight size={14} className={styles.wayIcon} />
              </a>
            </li>
            <li>
              <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className={styles.way}>
                <span className={styles.wayTitle}>Contribute</span>
                <span className={styles.wayText}>Orion is open source too: pick up an issue or improve a parser for a program’s site.</span>
                <IconArrowUpRight size={14} className={styles.wayIcon} />
              </a>
            </li>
            <li>
              <a href={`${REPO_URL}/issues/new?title=${encodeURIComponent('Program dates: ')}`} target="_blank" rel="noopener noreferrer" className={styles.way}>
                <span className={styles.wayTitle}>Report a wrong date</span>
                <span className={styles.wayText}>Programs change their sites; a quick report keeps every deadline right.</span>
                <IconArrowUpRight size={14} className={styles.wayIcon} />
              </a>
            </li>
            <li>
              <Link href="/community" className={styles.way}>
                <span className={styles.wayTitle}>Help someone in the community</span>
                <span className={styles.wayText}>Answer a question from someone opening their first pull request.</span>
              </Link>
            </li>
          </Panel>
        </section>

        <section aria-labelledby="support-free">
          <h2 id="support-free" className={styles.heading}>
            Free, all of it
          </h2>
          <ul className={styles.free}>
            {FREE.map(([title, text, href]) => (
              <li key={title}>
                <Link href={href} className={styles.freeTitle}>
                  {title}
                </Link>
                <span className={styles.freeText}>{text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
