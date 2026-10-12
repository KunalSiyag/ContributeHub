'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { IconCheck } from '../icons';
import styles from './controls.module.css';

export type MenuEntry =
  | {
      type?: 'item';
      label: ReactNode;
      icon?: ReactNode;
      hint?: ReactNode;
      onSelect?: () => void;
      href?: string;
      external?: boolean;
      checked?: boolean;
      danger?: boolean;
      disabled?: boolean;
    }
  | { type: 'separator' }
  | { type: 'label'; label: ReactNode };

interface MenuProps {
  /** Render prop for the trigger; spread the given props onto a <button>. */
  trigger: (props: {
    'aria-haspopup': 'menu';
    'aria-expanded': boolean;
    'aria-controls': string;
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
    ref: (node: HTMLButtonElement | null) => void;
  }) => ReactElement;
  items: MenuEntry[];
  align?: 'start' | 'end';
  label?: string;
}

export function Menu({ trigger, items, align = 'start', label }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = useCallback(
    (focusTrigger = true) => {
      setOpen(false);
      if (focusTrigger) triggerEl?.focus();
    },
    [triggerEl]
  );

  const focusItem = (index: number) => {
    const nodes = menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])');
    if (!nodes || nodes.length === 0) return;
    const i = ((index % nodes.length) + nodes.length) % nodes.length;
    nodes[i].focus();
  };

  // The menu is portalled to <body> with fixed positioning so scroll
  // containers (boards, tables) can't clip it. Position is measured from the
  // trigger and written straight to the DOM (layout read → style write).
  useLayoutEffect(() => {
    const root = rootRef.current;
    const menu = menuRef.current;
    if (!open || !root || !menu) return;
    const rect = root.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    const { offsetWidth: width, offsetHeight: height } = menu;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeUp = spaceBelow < height + gap + margin && rect.top > spaceBelow;
    const top = placeUp ? Math.max(margin, rect.top - gap - height) : Math.min(window.innerHeight - height - margin, rect.bottom + gap);
    let left = align === 'end' ? rect.right - width : rect.left;
    left = Math.min(Math.max(margin, left), window.innerWidth - width - margin);
    menu.style.top = `${Math.max(margin, top)}px`;
    menu.style.left = `${left}px`;
    menu.classList.toggle(styles.menuUp, placeUp);
    focusItem(0);
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) close(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    // A fixed menu would drift from its trigger; close instead.
    const onScroll = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nodes = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? []
    );
    const current = nodes.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusItem(nodes.length - 1);
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  const triggerNode = trigger({
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': id,
    onClick: () => setOpen(value => !value),
    onKeyDown: event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setOpen(true);
      }
    },
    ref: setTriggerEl,
  });

  return (
    <div className={styles.menuRoot} ref={rootRef}>
      {triggerNode}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={id}
            role="menu"
            aria-label={label}
            className={[styles.menu, align === 'end' ? styles.menuEnd : styles.menuStart].join(' ')}
            onKeyDown={onMenuKeyDown}
          >
            {items.map((entry, index) => {
              if (entry.type === 'separator') return <div key={index} className={styles.menuSeparator} role="separator" />;
              if (entry.type === 'label')
                return (
                  <div key={index} className={`${styles.menuLabel} eyebrow`}>
                    {entry.label}
                  </div>
                );

              const className = [styles.menuItem, entry.danger && styles.menuItemDanger].filter(Boolean).join(' ');
              const content = (
                <>
                  <span className={styles.menuIcon}>{entry.icon}</span>
                  <span className={styles.menuText}>{entry.label}</span>
                  {entry.hint && <span className={styles.menuHint}>{entry.hint}</span>}
                  {entry.checked && (
                    <span className={styles.menuCheck}>
                      <IconCheck size={14} />
                    </span>
                  )}
                </>
              );

              if (entry.href) {
                return entry.external ? (
                  <a
                    key={index}
                    role="menuitem"
                    tabIndex={-1}
                    className={className}
                    href={entry.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => close(false)}
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    key={index}
                    role="menuitem"
                    tabIndex={-1}
                    className={className}
                    href={entry.href}
                    onClick={() => close(false)}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={index}
                  type="button"
                  role={entry.checked !== undefined ? 'menuitemradio' : 'menuitem'}
                  aria-checked={entry.checked}
                  aria-disabled={entry.disabled || undefined}
                  tabIndex={-1}
                  className={className}
                  onClick={() => {
                    if (entry.disabled) return;
                    close();
                    entry.onSelect?.();
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
