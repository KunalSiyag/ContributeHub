import type { Metadata } from 'next';
import PreferencesClient from './PreferencesClient';

export const metadata: Metadata = {
  title: 'Preferences',
  description: 'Set the languages, tools, interests and experience level that drive your issue matches.',
};

export default function PreferencesPage() {
  return <PreferencesClient />;
}
