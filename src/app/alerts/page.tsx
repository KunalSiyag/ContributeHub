import type { Metadata } from 'next';
import { isEmailConfigured } from '@/lib/alert-digest.server';
import { getMyAlerts } from '@/lib/alerts.server';
import { PageHeader } from '@/components/ui/primitives';
import AlertsClient, { type AlertPrefill } from './AlertsClient';

export const metadata: Metadata = {
  title: 'Alerts',
  description: 'Saved issue searches that tell you when new issues match: in Orion, in your browser, by RSS or by email.',
  alternates: { canonical: '/alerts' },
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function AlertsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { state, alerts } = await getMyAlerts();
  const prefill: AlertPrefill | null = params.new === '1' ? { preset: params.preset, language: params.language, q: params.q, repos: params.repos } : null;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Alerts"
        description="Saved searches that tell you when new issues match them. Orion checks every ten minutes while it's open, can notify you in the browser, and gives every alert an RSS feed and an optional daily email."
      />
      <AlertsClient initialState={state} initialAlerts={alerts} emailAvailable={isEmailConfigured()} prefill={prefill} />
    </>
  );
}
