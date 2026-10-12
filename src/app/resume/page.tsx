import type { Metadata } from 'next';
import ResumeClient from './ResumeClient';

export const metadata: Metadata = {
  title: 'Resume match',
  description:
    'Upload a resume to pull out your languages and tools, then see open GitHub issues that fit them. Files are read in memory and never stored.',
};

export default function ResumePage() {
  return <ResumeClient />;
}
