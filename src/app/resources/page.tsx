import type { Metadata } from 'next';
import { IconArrowUpRight } from '@/components/icons';
import { PageHeader, SectionHead } from '@/components/ui/primitives';
import { ARTICLES_SOURCE, getCommunityArticles } from '@/lib/articles';
import { RESOURCES, RESOURCES_REVIEWED } from '@/lib/resources';
import RelativeTime from '@/components/RelativeTime';
import rows from '@/components/rows.module.css';
import ResourceLibrary from './ResourceLibrary';
import ResourcePaths from './ResourcePaths';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'Guides, tools and communities for open source contributors, from a first pull request to mentorship programs and paid bounties.',
};

const REVIEWED_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${RESOURCES_REVIEWED}T00:00:00Z`));

export default async function ResourcesPage() {
  const articles = await getCommunityArticles();

  return (
    <>
      <PageHeader
        eyebrow="Learn"
        title="Resources"
        description="Guides, tools and communities for every stage, from your first pull request to paid bounties."
      />

      <section id="paths" className={styles.section} aria-labelledby="paths-heading">
        <SectionHead title="Paths" id="paths-heading" />
        <ResourcePaths />
      </section>

      <section id="library" className={styles.library} aria-labelledby="library-heading">
        <SectionHead title="Library" id="library-heading" count={RESOURCES.length} />
        <ResourceLibrary />
      </section>

      {articles.length > 0 && (
        <section id="reading" className={styles.reading} aria-labelledby="reading-heading">
          <SectionHead title="Fresh from DEV" id="reading-heading" href={ARTICLES_SOURCE} linkLabel="More on DEV" external />
          <ul className={rows.list}>
            {articles.map(article => (
              <li key={article.url} className={rows.row}>
                <div className={rows.main}>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className={`${rows.title} ${rows.stretch}`}>
                    {article.title}
                  </a>
                  <div className={rows.meta}>
                    <span className={rows.metaItem}>{article.author}</span>
                    <span className={rows.metaItem}>{article.minutes} min read</span>
                    <span className={rows.metaItem}>
                      <RelativeTime date={article.published} />
                    </span>
                    <span className={rows.metaItem}>
                      {article.reactions} reactions · {article.comments} comments
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.readingNote}>The week’s most-liked posts tagged #opensource on DEV, refreshed every six hours.</p>
        </section>
      )}

      <p className={styles.footnote}>
        Links checked <time dateTime={RESOURCES_REVIEWED}>{REVIEWED_LABEL}</time>. Know a resource that belongs here?{' '}
        <a
          className={styles.footnoteLink}
          href="https://github.com/KunalSiyag/ContributeHub/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          Suggest it on GitHub
          <IconArrowUpRight size={12} />
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </p>
    </>
  );
}
