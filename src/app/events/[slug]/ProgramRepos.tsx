import type { Repository } from '@/types';
import { keepLastGoodPage, searchRepositories } from '@/lib/github';
import RepoRow from '@/components/RepoRow';
import rows from '@/components/rows.module.css';
import styles from './page.module.css';

/** Repositories that opted in with the program's topic and are asking for help. */
export function programRepoQuery(topic: string) {
  return `topic:${topic} archived:false help-wanted-issues:>0`;
}

async function load(topic: string): Promise<{ items: Repository[]; total: number } | null> {
  try {
    const data = await searchRepositories(programRepoQuery(topic), { sort: 'updated', perPage: 6, revalidate: 3600 });
    return { items: data.items, total: data.total_count };
  } catch (error) {
    await keepLastGoodPage(error);
    return null;
  }
}

export default async function ProgramRepos({ topic }: { topic: string }) {
  const result = await load(topic);
  if (!result) return <p className={styles.sectionCaption}>GitHub could not be reached; try again shortly.</p>;
  if (result.items.length === 0) return <p className={styles.sectionCaption}>No repositories with this topic are asking for help right now.</p>;
  return (
    <>
      <p className={styles.sectionCaption}>
        {result.total.toLocaleString('en-US')} repositories carry the <code>{topic}</code> topic and have help-wanted issues. Recently
        updated first.
      </p>
      <ul className={rows.list}>
        {result.items.map(repo => (
          <RepoRow key={repo.id} repo={repo} />
        ))}
      </ul>
    </>
  );
}
