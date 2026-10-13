import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categoryLabel, relatedHref } from '@/lib/community';
import { getDiscussion, getMyReaction } from '@/lib/community.server';
import Markdown from '@/components/Markdown';
import RelativeTime from '@/components/RelativeTime';
import { Avatar, Tag } from '@/components/ui/primitives';
import { IconArrowLeft } from '@/components/icons';
import ForumUnavailable from '../ForumUnavailable';
import DeletePost from './DeletePost';
import Reactions from './Reactions';
import ReplyForm from './ReplyForm';
import styles from '../community.module.css';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { thread } = await getDiscussion((await params).id);
  return thread ? { title: thread.title, description: thread.body.slice(0, 160) } : { title: 'Discussion' };
}

function Author({ name, avatar, login }: { name: string; avatar: string | null; login: string | null }) {
  return (
    <span className={styles.author}>
      <Avatar src={avatar} name={name} size={20} />
      {login ? <Link href={`/u/${login}`}>{name}</Link> : <span>{name}</span>}
    </span>
  );
}

export default async function DiscussionPage({ params }: { params: Promise<Params> }) {
  const { state, thread, replies } = await getDiscussion((await params).id);
  if (state !== 'ready') return <ForumUnavailable state={state} />;
  if (!thread) notFound();
  // Reaction counts arrive with migration 09; until then the buttons stay hidden.
  const reactions = typeof thread.like_count === 'number';
  const mine = reactions ? await getMyReaction(thread.id) : null;

  return (
    <div className={styles.thread}>
      <Link href="/community" className={styles.back}>
        <IconArrowLeft size={14} /> Community
      </Link>

      <article className={styles.post} aria-labelledby="thread-title">
        <div className={styles.postHead}>
          <div className={styles.postTags}>
            <Tag tone="muted">{categoryLabel(thread.category)}</Tag>
            {thread.related && (
              <Link href={relatedHref(thread.related)} className={styles.related}>
                {thread.related}
              </Link>
            )}
          </div>
          <h1 id="thread-title" className={styles.threadTitle}>
            {thread.title}
          </h1>
          <div className={styles.postMeta}>
            <Author name={thread.author_name} avatar={thread.author_avatar} login={thread.author_login} />
            <RelativeTime date={thread.created_at} prefix="posted" />
            <DeletePost table="discussions" id={thread.id} authorId={thread.author_id} redirectTo="/community" />
          </div>
        </div>
        <Markdown text={thread.body} images />
        {reactions && <Reactions discussionId={thread.id} title={thread.title} likes={thread.like_count} dislikes={thread.dislike_count} mine={mine} />}
      </article>

      <section aria-labelledby="replies-heading" className={styles.replySection}>
        <h2 id="replies-heading" className={styles.repliesTitle}>
          {replies.length === 0 ? 'No replies yet' : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
        </h2>
        {replies.length > 0 && (
          <ol className={styles.replyList}>
            {replies.map(reply => (
              <li key={reply.id} className={styles.reply}>
                <div className={styles.postMeta}>
                  <Author name={reply.author_name} avatar={reply.author_avatar} login={reply.author_login} />
                  <RelativeTime date={reply.created_at} />
                  <DeletePost table="discussion_replies" id={reply.id} authorId={reply.author_id} />
                </div>
                <Markdown text={reply.body} images />
              </li>
            ))}
          </ol>
        )}
        <ReplyForm discussionId={thread.id} />
      </section>
    </div>
  );
}
