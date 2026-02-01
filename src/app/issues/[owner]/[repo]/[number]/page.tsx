import { Metadata } from 'next';
import IssueDetailClient from './IssueDetailClient';

interface Props {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo, number } = await params;
  return {
    title: `Issue #${number} - ${owner}/${repo} | ContributeHub`,
    description: `View details and AI-powered fix suggestions for issue #${number} in ${owner}/${repo}`,
  };
}

export default async function IssueDetailPage({ params }: Props) {
  const { owner, repo, number } = await params;
  
  return (
    <IssueDetailClient 
      owner={owner} 
      repo={repo} 
      issueNumber={parseInt(number, 10)} 
    />
  );
}
