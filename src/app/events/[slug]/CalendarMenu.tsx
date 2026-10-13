'use client';

import { Menu } from '@/components/ui/Menu';
import { Button } from '@/components/ui/Button';
import { IconArrowUpRight, IconCalendarPlus, IconChevronDown, IconDownload } from '@/components/icons';

interface CalendarMenuProps {
  googleUrl: string;
  icsDataUri: string;
  fileName: string;
  /** The milestone that gets added, e.g. "Application deadline". */
  milestone: string;
  /** Its formatted date, e.g. "Apr 8, 2027". */
  date: string;
}

/** "Add to calendar" for the next deadline: Google Calendar link or an .ics download. */
export default function CalendarMenu({ googleUrl, icsDataUri, fileName, milestone, date }: CalendarMenuProps) {
  // Menu items can't carry a `download` attribute, so the .ics item clicks a
  // temporary anchor that does.
  const download = () => {
    const link = document.createElement('a');
    link.href = icsDataUri;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Menu
      align="end"
      label="Add to calendar"
      items={[
        {
          type: 'label',
          label: (
            <>
              {milestone}
              <br />
              {date}
            </>
          ),
        },
        { label: 'Google Calendar', icon: <IconArrowUpRight size={14} />, href: googleUrl, external: true },
        { label: 'Download .ics', icon: <IconDownload size={14} />, onSelect: download },
      ]}
      trigger={props => (
        <Button variant="secondary" {...props}>
          <IconCalendarPlus size={14} />
          Add to calendar
          <IconChevronDown size={13} />
        </Button>
      )}
    />
  );
}
