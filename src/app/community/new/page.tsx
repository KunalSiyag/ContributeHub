import type { Metadata } from 'next';
import Link from 'next/link';
import { isCategory } from '@/lib/community';
import { PageHeader } from '@/components/ui/primitives';
import { IconArrowLeft } from '@/components/icons';
import NewDiscussionForm from './NewDiscussionForm';
import styles from '../community.module.css';

export const metadata: Metadata = { title: 'Start a discussion', robots: { index: false } };

export default async function NewDiscussionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { category } = await searchParams;
  return (
    <>
      <Link href="/community" className={styles.back}>
        <IconArrowLeft size={14} /> Community
      </Link>
      <PageHeader eyebrow="Community" title="Start a discussion" description="Say what you tried and what you need. Specific questions get specific answers." />
      <NewDiscussionForm initialCategory={isCategory(category) ? category : 'general'} />
    </>
  );
}
