'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getAllEvents } from '@/lib/events';
import { STATUS_TONE } from '../TrackControl';
import { StatusDot, Kbd } from '../ui/primitives';
import {
  IconActivity,
  IconBell,
  IconBookOpen,
  IconHeart,
  IconRobot,
  IconBuilding,
  IconLayoutGrid,
  IconMessageSquare,
  IconRocket,
  IconCalendar,
  IconCoins,
  IconColumns,
  IconCompass,
  IconFileText,
  IconHome,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconTrendingUp,
  IconUser,
} from '../icons';
import styles from './CommandPalette.module.css';

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  href: string;
  keywords?: string;
}

const PAGES: Command[] = [
  { id: 'p-overview', group: 'Go to', label: 'Overview', icon: <IconHome size={15} />, href: '/dashboard', keywords: 'dashboard home' },
  { id: 'p-tracker', group: 'Go to', label: 'Tracker', icon: <IconColumns size={15} />, href: '/issues', keywords: 'board issues saved' },
  { id: 'p-alerts', group: 'Go to', label: 'Alerts', icon: <IconBell size={15} />, href: '/alerts', keywords: 'notifications saved searches email digest rss watch' },
  { id: 'p-discover', group: 'Go to', label: 'Discover', icon: <IconCompass size={15} />, href: '/discover', keywords: 'search find issues projects' },
  { id: 'p-orgs', group: 'Go to', label: 'Organizations', icon: <IconCompass size={15} />, href: '/discover?tab=organizations', keywords: 'gsoc gssoc orgs' },
  { id: 'p-rising', group: 'Go to', label: 'Rising repositories', icon: <IconTrendingUp size={15} />, href: '/trending', keywords: 'trending new popular stars web3 ai' },
  { id: 'p-repos', group: 'Go to', label: 'Repository report', icon: <IconActivity size={15} />, href: '/repos', keywords: 'analyze health score maintainers repo analyzer' },
  { id: 'p-profile', group: 'Go to', label: 'Contributor profile', icon: <IconUser size={15} />, href: '/u', keywords: 'portfolio resume merged pull requests share' },
  { id: 'p-assistant', group: 'Go to', label: 'Assistant', icon: <IconSparkles size={15} />, href: '/assistant', keywords: 'ai ask explain repository chat help' },
  { id: 'p-starter', group: 'Go to', label: 'Starter projects', icon: <IconRocket size={15} />, href: '/starter', keywords: 'beginner first contribution up for grabs good first issue' },
  { id: 'p-collections', group: 'Go to', label: 'Collections', icon: <IconLayoutGrid size={15} />, href: '/collections', keywords: 'categories domains ai databases frameworks' },
  { id: 'p-companies', group: 'Go to', label: 'Open source companies', icon: <IconBuilding size={15} />, href: '/companies', keywords: 'yc y combinator hiring startups' },
  { id: 'p-repo-bot', group: 'Go to', label: 'Repo bot', icon: <IconRobot size={15} />, href: '/repo-bot', keywords: 'maintainer welcome bot github actions selfbot commands' },
  { id: 'p-support', group: 'Go to', label: 'Support Orion', icon: <IconHeart size={15} />, href: '/support', keywords: 'sponsor donate premium free star' },
  { id: 'p-compare', group: 'Go to', label: 'Compare repositories', icon: <IconActivity size={15} />, href: '/repos/compare', keywords: 'versus vs side by side' },
  { id: 'p-community', group: 'Go to', label: 'Community', icon: <IconMessageSquare size={15} />, href: '/community', keywords: 'forum discussions ask help questions' },
  { id: 'p-leaderboard', group: 'Go to', label: 'Leaderboard', icon: <IconTrendingUp size={15} />, href: '/leaderboard', keywords: 'ranking top contributors merged' },
  { id: 'p-programs', group: 'Go to', label: 'Programs & deadlines', icon: <IconCalendar size={15} />, href: '/events', keywords: 'events gsoc hacktoberfest outreachy' },
  { id: 'p-bounties', group: 'Go to', label: 'Bounties', icon: <IconCoins size={15} />, href: '/bounties', keywords: 'paid money rewards' },
  { id: 'p-resources', group: 'Go to', label: 'Resources', icon: <IconBookOpen size={15} />, href: '/resources', keywords: 'learn guides' },
  { id: 'p-resume', group: 'Go to', label: 'Resume match', icon: <IconFileText size={15} />, href: '/resume', keywords: 'cv skills' },
  { id: 'p-prefs', group: 'Go to', label: 'Preferences', icon: <IconSettings size={15} />, href: '/preferences', keywords: 'skills languages settings' },
];

function matches(command: Command, query: string) {
  const haystack = `${command.label} ${command.hint ?? ''} ${command.keywords ?? ''}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(term => haystack.includes(term));
}

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent('orion:command-palette'));
}

/** ⌘K / Ctrl+K: jump to pages, tracked issues and programs, or search GitHub issues. */
export default function CommandPalette() {
  const router = useRouter();
  const { issues } = useWorkspace();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('orion:command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('orion:command-palette', onOpen);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const commands = useMemo(() => {
    const tracked: Command[] = issues.map(issue => ({
      id: `i-${issue.id}`,
      group: 'Tracked issues',
      label: issue.title,
      hint: `${issue.repo_full_name}#${issue.issue_number}`,
      icon: <StatusDot tone={STATUS_TONE[issue.status]} />,
      href: `/issues/${issue.repo_full_name}/${issue.issue_number}`,
      keywords: issue.labels.join(' '),
    }));
    const programs: Command[] = getAllEvents().map(event => ({
      id: `e-${event.slug}`,
      group: 'Programs',
      label: event.name,
      hint: event.nextDeadline ? `${event.nextDeadline.label} · ${event.nextDeadline.date}` : event.organizer,
      icon: <IconCalendar size={15} />,
      href: `/events/${event.slug}`,
      keywords: `${event.shortName} ${event.organizer}`,
    }));
    return [...PAGES, ...tracked, ...programs];
  }, [issues]);

  const results = useMemo(() => {
    const q = query.trim();
    const found = q ? commands.filter(command => matches(command, q)) : commands.filter(c => c.group === 'Go to');
    const limited = [...found.filter(c => c.group === 'Go to'), ...found.filter(c => c.group === 'Tracked issues').slice(0, 6), ...found.filter(c => c.group === 'Programs').slice(0, 4)];
    if (q) {
      limited.push({
        id: 'search',
        group: 'Search',
        label: `Search GitHub issues for “${q}”`,
        icon: <IconSearch size={15} />,
        href: `/discover?q=${encodeURIComponent(q)}`,
      });
    }
    return limited;
  }, [commands, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setActive(0);
  };

  const run = (command: Command | undefined) => {
    if (!command) return;
    close();
    router.push(command.href);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = (active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % Math.max(results.length, 1);
      setActive(next);
      listRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(results[active]);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="Command palette"
      onClose={close}
      onCancel={event => {
        event.preventDefault();
        close();
      }}
      onClick={event => {
        if (event.target === dialogRef.current) close();
      }}
    >
      {open && (
        <div className={styles.panel}>
          <div className={styles.inputRow}>
            <IconSearch size={16} className={styles.inputIcon} />
            <input
              ref={inputRef}
              className={styles.input}
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Jump to a page, tracked issue or program…"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-results"
              aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
              spellCheck={false}
              autoComplete="off"
            />
            <Kbd>esc</Kbd>
          </div>
          <ul id="command-results" ref={listRef} className={styles.results} role="listbox">
            {results.length === 0 && <li className={styles.empty}>No matches</li>}
            {results.map((command, index) => {
              const header = index === 0 || results[index - 1].group !== command.group ? command.group : null;
              return (
                <li key={command.id} role="presentation">
                  {header && <p className={`${styles.group} eyebrow`}>{header}</p>}
                  <button
                    type="button"
                    id={`cmd-${command.id}`}
                    role="option"
                    aria-selected={index === active}
                    data-index={index}
                    className={styles.item}
                    onMouseMove={() => setActive(index)}
                    onClick={() => run(command)}
                    tabIndex={-1}
                  >
                    <span className={styles.itemIcon}>{command.icon}</span>
                    <span className={styles.itemLabel}>{command.label}</span>
                    {command.hint && <span className={styles.itemHint}>{command.hint}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={styles.footer}>
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
            </span>
            <span>
              <Kbd>↵</Kbd> to open
            </span>
          </div>
        </div>
      )}
    </dialog>
  );
}
