'use client';

import { Segmented } from '../ui/Tabs';
import { IconMonitor, IconMoon, IconSun } from '../icons';
import { useThemePreference, type ThemePreference } from '@/lib/theme';

export default function ThemeSwitch() {
  const [preference, setPreference] = useThemePreference();

  return (
    <Segmented<ThemePreference>
      label="Color theme"
      iconOnly
      value={preference}
      onChange={setPreference}
      options={[
        { value: 'light', label: 'Light', title: 'Light theme', icon: <IconSun size={14} /> },
        { value: 'dark', label: 'Dark', title: 'Dark theme', icon: <IconMoon size={14} /> },
        { value: 'system', label: 'System', title: 'Match system', icon: <IconMonitor size={14} /> },
      ]}
    />
  );
}
