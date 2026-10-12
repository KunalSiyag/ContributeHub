import Link from 'next/link';
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  iconOnly?: boolean;
  full?: boolean;
  /** Fully rounded, for marketing calls to action. */
  pill?: boolean;
  loading?: boolean;
  className?: string;
}

export function buttonClass({
  variant = 'secondary',
  size = 'md',
  iconOnly,
  full,
  pill,
  loading,
  className,
}: StyleProps = {}) {
  return [
    styles.button,
    styles[variant],
    size !== 'md' && styles[size],
    iconOnly && styles.iconOnly,
    full && styles.full,
    pill && styles.pill,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

function Content({ children, loading }: { children: ReactNode; loading?: boolean }) {
  return (
    <>
      <span className={styles.label}>{children}</span>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
    </>
  );
}

type ButtonProps = StyleProps & ComponentProps<'button'>;

export function Button({
  variant,
  size,
  iconOnly,
  full,
  pill,
  loading,
  className,
  children,
  type = 'button',
  disabled,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, iconOnly, full, pill, loading, className })}
      disabled={disabled}
      // While loading, stay focusable (a disabled button drops focus to <body>)
      // but ignore activation.
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={event => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      <Content loading={loading}>{children}</Content>
    </button>
  );
}

type ButtonLinkProps = StyleProps & ComponentProps<typeof Link>;

export function ButtonLink({ variant, size, iconOnly, full, pill, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, iconOnly, full, pill, className })} {...rest}>
      <Content>{children}</Content>
    </Link>
  );
}

type ButtonAnchorProps = StyleProps & AnchorHTMLAttributes<HTMLAnchorElement>;

/** External link styled as a button. Opens in a new tab by default. */
export function ButtonAnchor({
  variant,
  size,
  iconOnly,
  full,
  pill,
  className,
  children,
  target = '_blank',
  rel = 'noopener noreferrer',
  ...rest
}: ButtonAnchorProps) {
  return (
    <a
      className={buttonClass({ variant, size, iconOnly, full, pill, className })}
      target={target}
      rel={rel}
      {...rest}
    >
      <Content>{children}</Content>
    </a>
  );
}
