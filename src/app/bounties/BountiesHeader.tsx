import { PageHeader } from '@/components/ui/primitives';

/** Shared by the page and its loading state so the header never shifts. */
export default function BountiesHeader() {
  return (
    <PageHeader
      eyebrow="Opportunities"
      title="Bounties"
      description="Open GitHub issues with a stated reward. Maintainers pay out on their own platforms (GitHub Sponsors, Algora, Opire); Orion only finds them."
    />
  );
}
