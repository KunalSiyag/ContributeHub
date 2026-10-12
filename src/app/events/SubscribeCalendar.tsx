'use client';

import { Menu } from '@/components/ui/Menu';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { IconCalendarPlus, IconChevronDown, IconCopy, IconDownload, IconExternalLink } from '@/components/icons';

/** Subscribe to every program's key dates (/calendar.ics) in a calendar app. */
export default function SubscribeCalendar({ siteUrl }: { siteUrl: string }) {
  const { toast } = useToast();
  const feed = `${siteUrl}/calendar.ics`;
  const webcal = feed.replace(/^https?:/, 'webcal:');

  return (
    <Menu
      align="end"
      label="Subscribe to program deadlines"
      items={[
        { type: 'label', label: 'Keeps itself up to date' },
        {
          label: 'Google Calendar',
          icon: <IconExternalLink size={14} />,
          href: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
          external: true,
        },
        { label: 'Apple or Outlook calendar', icon: <IconCalendarPlus size={14} />, href: webcal, external: true },
        {
          label: 'Copy calendar link',
          icon: <IconCopy size={14} />,
          onSelect: () => {
            navigator.clipboard.writeText(feed).then(
              () => toast('Calendar link copied.', { tone: 'success' }),
              () => toast(feed)
            );
          },
        },
        { label: 'Download .ics', icon: <IconDownload size={14} />, href: '/calendar.ics' },
      ]}
      trigger={props => (
        <Button variant="secondary" {...props}>
          <IconCalendarPlus size={14} />
          Subscribe
          <IconChevronDown size={12} />
        </Button>
      )}
    />
  );
}
