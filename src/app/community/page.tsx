import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORIES, categoryLabel, isCategory } from '@/lib/community';
import { listDiscussions } from '@/lib/community.server';
import RelativeTime from '@/components/RelativeTime';
import { Avatar, EmptyState, PageHeader, Tag } from '@/components/ui/primitives';
import { PillLink, Pills } from '@/components/ui/Tabs';
import { IconMessageSquare, IconThumbsUp } from '@/components/icons';
import rows from '@/components/rows.module.css';
import ForumUnavailable from './ForumUnavailable';
import StartDiscussion from './StartDiscussion';
import styles from './community.module.css';

export const metadata: Metadata = {
  title: 'Community',
  description: 'Ask about programs, get unstuck on an issue and share merged work with other open source contributors.',
  alternates: { canonical: '/community' },
};

export const dynamic = 'force-dynamic';

export default async function CommunityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { category } = await searchParams;
  const active = isCategory(category) ? category : undefined;
  const { state, items } = await listDiscussions(active);

  return (
    <>
      <PageHeader
        eyebrow="Grow"
        title="Community"
        description="Ask about programs, get unstuck on an issue and share what you shipped. Everyone can read; sign in to post."
        actions={state === 'ready' ? <StartDiscussion /> : undefined}
      />

      {state !== 'ready' ? (
        <ForumUnavailable state={state} />
      ) : (
        <>
          <Pills label="Category">
            <PillLink href="/community" active={!active}>
              Everything
            </PillLink>
            {CATEGORIES.map(c => (
              <PillLink key={c.value} href={`/community?category=${c.value}`} active={c.value === active}>
                {c.label}
              </PillLink>
            ))}
          </Pills>

          {active && <p className={styles.blurb}>{CATEGORIES.find(c => c.value === active)?.blurb}</p>}

          {items.length === 0 ? (
            <EmptyState icon={<IconMessageSquare size={16} />} title="No discussions here yet" action={<StartDiscussion variant="secondary" />}>
              Start the first one.
            </EmptyState>
          ) : (
            <ul className={`${rows.list} ${styles.threads}`} aria-label="Discussions">
              {items.map(thread => (
                <li key={thread.id} className={`${rows.row} ${rows.withLead}`} data-spotlight="wash">
                  <Avatar src={thread.author_avatar} name={thread.author_name} size={32} />
                  <div className={rows.main}>
                    <Link href={`/community/${thread.id}`} className={`${rows.title} ${rows.stretch}`}>
                      {thread.title}
                    </Link>
                    <div className={rows.meta}>
                      <Tag tone="muted">{categoryLabel(thread.category)}</Tag>
                      {thread.related && <span className={`${rows.metaItem} ${styles.relatedMeta}`}>{thread.related}</span>}
                      <span className={rows.metaItem}>{thread.author_name}</span>
                      <span className={rows.metaItem}>
                        <RelativeTime date={thread.last_activity_at} prefix={thread.reply_count > 0 ? 'active' : 'posted'} />
                      </span>
                    </div>
                  </div>
                  <div className={rows.aside}>
                    {thread.like_count > 0 && (
                      <span className={styles.replies} title={`${thread.like_count} likes`}>
                        <IconThumbsUp size={13} aria-hidden="true" /> {thread.like_count}
                        <span className="visually-hidden"> likes</span>
                      </span>
                    )}
                    <span className={styles.replies} title={`${thread.reply_count} replies`}>
                      <IconMessageSquare size={13} aria-hidden="true" /> {thread.reply_count}
                      <span className="visually-hidden"> replies</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
