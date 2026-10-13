'use client';

import Link from 'next/link';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './controls.module.css';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number | string;
  href?: string;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange?: (value: T) => void;
  label: string;
  className?: string;
}

/**
 * Underline tabs. Items with `href` render as links (URL-driven state);
 * otherwise they render as an ARIA tablist driven by `onChange`.
 */
export function Tabs<T extends string>({ items, value, onChange, label, className }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const linkMode = items.every(item => item.href);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (linkMode || !onChange) return;
    const index = items.findIndex(item => item.value === value);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    onChange(items[next].value);
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  };

  if (linkMode) {
    return (
      <nav className={[styles.tabs, className].filter(Boolean).join(' ')} aria-label={label}>
        {items.map(item => (
          <Link
            key={item.value}
            href={item.href!}
            className={styles.tab}
            aria-current={item.value === value ? 'page' : undefined}
            scroll={false}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && <span className={styles.tabCount}>{item.count}</span>}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={[styles.tabs, className].filter(Boolean).join(' ')}
      onKeyDown={onKeyDown}
    >
      {items.map(item => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={styles.tab}
            onClick={() => onChange?.(item.value)}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && <span className={styles.tabCount}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: ReactNode; icon?: ReactNode; title?: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  iconOnly?: boolean;
}

export function Segmented<T extends string>({ options, value, onChange, label, iconOnly }: SegmentedProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);

  // Radio-group keyboard model: one tab stop, arrow keys move and select.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = options.findIndex(option => option.value === value);
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else next = options.length - 1;
    onChange(options[next].value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div ref={groupRef} className={styles.segmented} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map(option => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            title={option.title}
            aria-label={iconOnly ? option.title : undefined}
            className={[styles.segment, iconOnly && styles.segmentIconOnly].filter(Boolean).join(' ')}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {!iconOnly && option.label}
          </button>
        );
      })}
    </div>
  );
}

interface PillProps {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  title?: string;
}

export function Pill({ pressed, onClick, children, count, title }: PillProps) {
  return (
    <button type="button" className={styles.pill} aria-pressed={pressed} onClick={onClick} title={title}>
      {children}
      {count !== undefined && <span className={styles.pillCount}>{count}</span>}
    </button>
  );
}

/** A filter pill that is a link, for filters kept in the URL of a server-rendered page. */
export function PillLink({ href, active, children, count }: { href: string; active: boolean; children: ReactNode; count?: number }) {
  return (
    <Link href={href} className={styles.pill} aria-current={active ? 'true' : undefined} scroll={false}>
      {children}
      {count !== undefined && <span className={styles.pillCount}>{count}</span>}
    </Link>
  );
}

export function Pills({
  children,
  label,
  describedBy,
  scroll = false,
}: {
  children: ReactNode;
  label?: string;
  describedBy?: string;
  /** Keep pills on one line and scroll sideways (useful on phones). */
  scroll?: boolean;
}) {
  return (
    <div
      className={[styles.pills, scroll && styles.pillsScroll].filter(Boolean).join(' ')}
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
    >
      {children}
    </div>
  );
}
