import type { Metadata } from 'next';
import Link from 'next/link';
import { collectionSlug, COLLECTIONS_SOURCE, getCollections } from '@/lib/collections';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { IconLayoutGrid } from '@/components/icons';
import styles from './collections.module.css';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Open source projects grouped by domain, from AI agent frameworks and MCP servers to databases and CSS frameworks.',
  alternates: { canonical: '/collections' },
};

/** Collections people look for first. */
const FEATURED = /\b(ai|llm|agent|mcp|rag|coding|vector|database|devops|observability|security|web framework)/i;

export default async function CollectionsPage() {
  const collections = await getCollections();
  const featured = collections.filter(c => FEATURED.test(c.name));
  const rest = collections.filter(c => !FEATURED.test(c.name));

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Collections"
        description="Projects grouped by domain. Pick an area you want to grow in, compare its projects and open a report on any of them before you contribute."
      />
      {collections.length === 0 ? (
        <EmptyState icon={<IconLayoutGrid size={16} />} title="Collections are unavailable right now">
          They come from OSS Insight; try again in a little while.
        </EmptyState>
      ) : (
        <div className={styles.sections}>
          {[
            { id: 'popular', title: 'Popular areas', items: featured },
            { id: 'all', title: 'Every collection', items: rest },
          ].map(group =>
            group.items.length > 0 ? (
              <section key={group.id} aria-labelledby={`collections-${group.id}`}>
                <h2 id={`collections-${group.id}`} className={styles.groupTitle}>
                  {group.title} <span className={styles.groupCount}>{group.items.length}</span>
                </h2>
                <ul className={styles.grid}>
                  {group.items.map(collection => (
                    <li key={collection.id}>
                      <Link href={`/collections/${collectionSlug(collection)}`} className={styles.card} data-spotlight>
                        {collection.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null
          )}
          <p className={styles.note}>
            Curated by{' '}
            <a href={COLLECTIONS_SOURCE} target="_blank" rel="noopener noreferrer">
              OSS Insight
            </a>
            ; figures on each project come live from GitHub.
          </p>
        </div>
      )}
    </>
  );
}
