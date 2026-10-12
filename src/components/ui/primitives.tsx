import type { CSSProperties, ReactNode } from 'react';
import { getLanguageColor } from '@/lib/utils';
import { IconAlert, IconArrowRight } from '../icons';
import Link from 'next/link';
import { AvatarImage } from './AvatarImage';
import styles from './primitives.module.css';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/* ---------- Tag ---------- */

interface TagProps {
  children: ReactNode;
  /** Data color (e.g. a GitHub label color). Shown as a dot, never as a fill. */
  dot?: string;
  tone?: 'default' | 'muted' | 'accent';
  title?: string;
  className?: string;
}

export function Tag({ children, dot, tone = 'default', title, className }: TagProps) {
  return (
    <span
      className={cx(styles.tag, tone === 'muted' && styles.tagMuted, tone === 'accent' && styles.tagAccent, className)}
      title={title}
    >
      {dot && <span className={styles.tagDot} style={{ background: dot }} aria-hidden="true" />}
      <span className={styles.tagText}>{children}</span>
    </span>
  );
}

/* ---------- Status dot ---------- */

export type StatusTone = 'neutral' | 'working' | 'review' | 'done' | 'danger';

const TONE_VAR: Record<StatusTone, string> = {
  neutral: 'var(--status-saved)',
  working: 'var(--status-working)',
  review: 'var(--status-review)',
  done: 'var(--status-done)',
  danger: 'var(--status-danger)',
};

interface StatusDotProps {
  tone?: StatusTone;
  children?: ReactNode;
  /** Adds a soft halo for "happening now" states. */
  live?: boolean;
  className?: string;
}

export function StatusDot({ tone = 'neutral', children, live, className }: StatusDotProps) {
  return (
    <span
      className={cx(styles.status, live && styles.statusLive, className)}
      style={{ '--dot': TONE_VAR[tone] } as CSSProperties}
    >
      <span className={styles.statusDot} aria-hidden="true" />
      {children}
    </span>
  );
}

/* ---------- Language ---------- */

export function LanguageDot({ language }: { language: string | null | undefined }) {
  if (!language) return null;
  return (
    <span className={styles.language}>
      <span className={styles.languageDot} style={{ background: getLanguageColor(language) }} aria-hidden="true" />
      {language}
    </span>
  );
}

/* ---------- Kbd ---------- */

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>;
}

/* ---------- Page header ---------- */

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderText}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description && <p className={styles.pageDescription}>{description}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </header>
  );
}

/* ---------- Section head ---------- */

interface SectionHeadProps {
  title: ReactNode;
  count?: number | string;
  href?: string;
  linkLabel?: string;
  external?: boolean;
  as?: 'h2' | 'h3';
  id?: string;
}

export function SectionHead({ title, count, href, linkLabel = 'View all', external, as: Tag = 'h2', id }: SectionHeadProps) {
  return (
    <div className={styles.sectionHead}>
      <Tag className={styles.sectionTitle} id={id}>
        {title}
        {count !== undefined && <span className={cx(styles.sectionCount, 'tabular')}>{count}</span>}
      </Tag>
      {href &&
        (external ? (
          <a className={styles.sectionLink} href={href} target="_blank" rel="noopener noreferrer">
            {linkLabel} <IconArrowRight size={13} />
          </a>
        ) : (
          <Link className={styles.sectionLink} href={href}>
            {linkLabel} <IconArrowRight size={13} />
          </Link>
        ))}
    </div>
  );
}

/* ---------- Panel ---------- */

export function Panel({
  children,
  className,
  as: Element = 'div',
  ...rest
}: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'ul' | 'ol' } & Record<string, unknown>) {
  return (
    <Element className={cx(styles.panel, className)} {...rest}>
      {children}
    </Element>
  );
}

/* ---------- Empty state ---------- */

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cx(styles.empty, className)}>
      {icon && <span className={styles.emptyIcon}>{icon}</span>}
      <p className={styles.emptyTitle}>{title}</p>
      {children && <p className={styles.emptyBody}>{children}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

/* ---------- Notice ---------- */

interface NoticeProps {
  tone?: 'info' | 'warning' | 'danger';
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Notice({ tone = 'info', title, children, icon, action, className }: NoticeProps) {
  return (
    <div
      className={cx(
        styles.notice,
        tone === 'warning' && styles.noticeWarning,
        tone === 'danger' && styles.noticeDanger,
        className
      )}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <span className={styles.noticeIcon}>{icon ?? <IconAlert size={15} />}</span>
      <div className={styles.noticeBody}>
        {title && <p className={styles.noticeTitle}>{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Skeleton ---------- */

export function Skeleton({
  width = '100%',
  height = 12,
  radius,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}) {
  return (
    <span
      className={cx(styles.skeleton, className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/* ---------- Spinner ---------- */

export function Spinner({ size = 14, label = 'Loading…' }: { size?: number; label?: string }) {
  return (
    <span role="status" style={{ display: 'inline-flex' }}>
      <span className={styles.spinner} style={{ width: size, height: size }} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

/* ---------- Avatar ---------- */

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  square?: boolean;
  className?: string;
}

export function Avatar({ src, name, size = 24, square, className }: AvatarProps) {
  const cls = cx(styles.avatar, square && styles.avatarSquare, className);
  const fallback = (
    <span className={cx(cls, styles.avatarFallback)} style={{ width: size, height: size }} aria-hidden="true">
      {(name || '?').slice(0, 1)}
    </span>
  );
  if (!src) return fallback;
  return <AvatarImage key={src} src={src} alt={name ?? ''} size={size} className={cls} fallback={fallback} />;
}
