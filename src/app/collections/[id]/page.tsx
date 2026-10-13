import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { collectionSlug, COLLECTIONS_SOURCE, getCollectionRepos, getCollections } from '@/lib/collections';
import { fetchLiveRepos } from '@/lib/github';
import RepoRow from '@/components/RepoRow';
import { Notice, PageHeader } from '@/components/ui/primitives';
import { IconArrowLeft } from '@/components/icons';
import rows from '@/components/rows.module.css';
import styles from '../collections.module.css';

export const revalidate = 21600;

type Params = { id: string };

async function find(param: string) {
  const id = /^(\d+)/.exec(param)?.[1];
  if (!id) return null;
  const collection = (await getCollections()).find(c => c.id === id);
  return collection ?? null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const collection = await find((await params).id);
  if (!collection) return { title: 'Collection' };
  return {
    title: `${collection.name} projects`,
    description: `Open source ${collection.name} projects ranked by stars, with live GitHub figures and a contributor report for each.`,
    alternates: { canonical: `/collections/${collectionSlug(collection)}` },
  };
}

export default async function CollectionPage({ params }: { params: Promise<Params> }) {
  const collection = await find((await params).id);
  if (!collection) notFound();

  const members = await getCollectionRepos(collection.id);
  const { repos, rateLimited } = await fetchLiveRepos(members);
  const live = members
    .map(name => repos.get(name.toLowerCase()))
    .filter((repo): repo is NonNullable<typeof repo> => Boolean(repo))
    .sort((a, b) => b.stargazers_count - a.stargazers_count);
  const missing = members.filter(name => !repos.has(name.toLowerCase()));

  return (
    <>
      <Link href="/collections" className={styles.back}>
        <IconArrowLeft size={14} /> Collections
      </Link>
      <PageHeader
        eyebrow="Collection"
        title={collection.name}
        description={`${members.length} projects, ranked by stars. Open any of them for a contributor report: review speed, maintainers and starter issues.`}
      />
      {rateLimited && <Notice tone="warning">GitHub is rate limiting, so some projects are listed without live figures.</Notice>}
      <ul className={rows.list} aria-label={`${collection.name} projects`}>
        {live.map(repo => (
          <RepoRow key={repo.id} repo={repo} />
        ))}
      </ul>
      {missing.length > 0 && (
        <p className={styles.note}>
          Also in this collection:{' '}
          {missing.map((name, i) => (
            <span key={name}>
              <Link href={`/repos/${name}`}>{name}</Link>
              {i < missing.length - 1 ? ', ' : ''}
            </span>
          ))}
          .
        </p>
      )}
      <p className={styles.note}>
        Curated by{' '}
        <a href={COLLECTIONS_SOURCE} target="_blank" rel="noopener noreferrer">
          OSS Insight
        </a>
        .
      </p>
    </>
  );
}
