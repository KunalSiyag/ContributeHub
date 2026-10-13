import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { IconBell } from '@/components/icons';

export const metadata: Metadata = { title: 'Stop alert emails', robots: { index: false } };

type Params = { alert?: string; member?: string; token?: string; done?: string; failed?: string };

/** Confirms before stopping emails, so link scanners in mail apps can't unsubscribe anyone. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<Params> }) {
  const { alert, member, token, done, failed } = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Alerts" title="Alert emails" />
      <UnsubscribeState alert={alert} member={member} token={token} done={done} failed={failed} />
    </>
  );
}

function UnsubscribeState({ alert, member, token, done, failed }: Params) {
  if (done) {
    return (
      <EmptyState icon={<IconBell size={16} />} title="Emails stopped" action={<Link href="/alerts" className={buttonClass({ variant: 'secondary' })}>Manage alerts</Link>}>
        Your alerts keep working in Orion; turn email back on there any time.
      </EmptyState>
    );
  }
  if (failed || !token || !(alert || member)) {
    return (
      <EmptyState icon={<IconBell size={16} />} title="This link doesn’t work" action={<Link href="/alerts" className={buttonClass({ variant: 'secondary' })}>Manage alerts</Link>}>
        It may be incomplete. Sign in to change your alert emails instead.
      </EmptyState>
    );
  }

  const query = new URLSearchParams(member ? { member, token } : { alert: alert!, token });
  return (
    <EmptyState
      icon={<IconBell size={16} />}
      title={member ? 'Stop all alert emails?' : 'Stop emails for this alert?'}
      action={
        <form method="post" action={`/api/alerts/unsubscribe?${query}`}>
          <input type="hidden" name="from" value="page" />
          <button type="submit" className={buttonClass({ variant: 'primary' })}>
            Stop emails
          </button>
        </form>
      }
    >
      {member ? 'Your alerts stay in Orion; only the emails stop.' : 'The alert stays in Orion; only its emails stop.'}
    </EmptyState>
  );
}
