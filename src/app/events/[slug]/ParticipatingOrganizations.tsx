import Link from 'next/link';
import { getEnrichedOrganizations, type EnrichedOrganization } from '@/lib/organizations';
import OrgRow from '@/components/OrgRow';
import rows from '@/components/rows.module.css';
import styles from './page.module.css';

/** Organization seed labels per program key; programs without a roster are skipped. */
export const ORGANIZATION_LABELS: Record<string, string> = {
  gsoc: 'gsoc',
  gssoc: 'gssoc',
  hacktoberfest: 'hacktoberfest',
  'lfx-mentorship': 'lfx',
};

export function discoverHref(label: string) {
  return `/discover?tab=organizations&program=${encodeURIComponent(label)}`;
}

export default async function ParticipatingOrganizations({ label }: { label: string }) {
  let organizations: EnrichedOrganization[];
  try {
    ({ organizations } = await getEnrichedOrganizations({ eventLabel: label }));
  } catch {
    organizations = [];
  }

  if (organizations.length === 0) {
    return (
      <p className={styles.orgsUnavailable}>
        Organization data is unavailable right now.{' '}
        <Link href={discoverHref(label)} className={styles.inlineLink}>
          Browse organizations in Discover
        </Link>
      </p>
    );
  }

  return (
    <ul className={rows.list}>
      {organizations.slice(0, 8).map(org => (
        <OrgRow key={org.slug} org={org} />
      ))}
    </ul>
  );
}
