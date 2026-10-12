'use client';

import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { IconChevronDown, IconSearch, IconX } from '../icons';
import styles from './forms.module.css';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

type ControlSize = 'sm' | 'md' | 'lg';
const sizeClass = (size: ControlSize) => (size === 'sm' ? styles.controlSm : size === 'lg' ? styles.controlLg : undefined);

/* ---------- Field (label + control + hint) ---------- */

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Render prop receives the id to put on the control. */
  children: (id: string, describedBy?: string) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children(id, describedBy)}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- Input ---------- */

type InputProps = Omit<ComponentProps<'input'>, 'size'> & {
  size?: ControlSize;
  icon?: ReactNode;
  invalid?: boolean;
  wrapperClassName?: string;
};

export function Input({ size = 'md', icon, invalid, wrapperClassName, className, ...rest }: InputProps) {
  return (
    <div className={cx(styles.control, sizeClass(size), invalid && styles.invalid, wrapperClassName)}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <input className={cx(styles.input, className)} aria-invalid={invalid || undefined} {...rest} />
    </div>
  );
}

/* ---------- Search input ---------- */

type SearchInputProps = Omit<ComponentProps<'input'>, 'size' | 'onChange' | 'value'> & {
  value: string;
  onValueChange: (value: string) => void;
  size?: ControlSize;
  wrapperClassName?: string;
};

export function SearchInput({
  value,
  onValueChange,
  size = 'md',
  wrapperClassName,
  placeholder = 'Search…',
  ref,
  onKeyDown,
  ...rest
}: SearchInputProps) {
  const innerRef = useRef<HTMLInputElement | null>(null);
  const setRef = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <div className={cx(styles.control, sizeClass(size), wrapperClassName)}>
      <span className={styles.icon}>
        <IconSearch size={14} />
      </span>
      <input
        type="search"
        spellCheck={false}
        autoComplete="off"
        {...rest}
        ref={setRef}
        className={cx(styles.input, styles.search)}
        value={value}
        placeholder={placeholder}
        onChange={event => onValueChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape' && value) {
            event.preventDefault();
            onValueChange('');
          }
          onKeyDown?.(event);
        }}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label="Clear search"
          onClick={() => {
            onValueChange('');
            innerRef.current?.focus();
          }}
        >
          <IconX size={12} />
        </button>
      )}
    </div>
  );
}

/* ---------- Select ---------- */

type SelectProps = Omit<ComponentProps<'select'>, 'size'> & {
  size?: ControlSize;
  options: Array<{ value: string; label: string }>;
  wrapperClassName?: string;
};

export function Select({ size = 'md', options, wrapperClassName, className, ...rest }: SelectProps) {
  return (
    <div className={cx(styles.control, styles.selectWrap, sizeClass(size), wrapperClassName)}>
      <select className={cx(styles.select, className)} {...rest}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className={styles.selectChevron}>
        <IconChevronDown size={13} />
      </span>
    </div>
  );
}

/* ---------- Textarea ---------- */

type TextareaProps = ComponentProps<'textarea'> & { invalid?: boolean; wrapperClassName?: string };

export function Textarea({ invalid, wrapperClassName, className, ...rest }: TextareaProps) {
  return (
    <div className={cx(styles.control, styles.textareaWrap, invalid && styles.invalid, wrapperClassName)}>
      <textarea className={cx(styles.textarea, className)} aria-invalid={invalid || undefined} {...rest} />
    </div>
  );
}

/* ---------- Checkbox ---------- */

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode };

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx(styles.checkboxLabel, className)}>
      <input type="checkbox" className={styles.checkbox} {...rest} />
      {label}
    </label>
  );
}

/* ---------- Chip input (free-text list) ---------- */

interface ChipInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
  max?: number;
  'aria-describedby'?: string;
  /** Normalize each entry before adding (e.g. trim, title-case). */
  transform?: (entry: string) => string;
}

export function ChipInput({ value, onChange, placeholder = 'Type and press Enter', id, max = 30, transform, ...rest }: ChipInputProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const entries = raw
      .split(',')
      .map(entry => (transform ? transform(entry.trim()) : entry.trim()))
      .filter(Boolean);
    if (entries.length === 0) return;
    const next = [...value];
    for (const entry of entries) {
      if (next.length >= max) break;
      if (!next.some(existing => existing.toLowerCase() === entry.toLowerCase())) next.push(entry);
    }
    onChange(next);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={cx(styles.control, styles.chips)} onClick={() => inputRef.current?.focus()}>
      {value.map(entry => (
        <span key={entry} className={styles.chip}>
          {entry}
          <button
            type="button"
            className={styles.chipRemove}
            aria-label={`Remove ${entry}`}
            onClick={event => {
              event.stopPropagation();
              onChange(value.filter(item => item !== entry));
            }}
          >
            <IconX size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        className={styles.chipInput}
        value={draft}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        spellCheck={false}
        autoComplete="off"
        aria-describedby={rest['aria-describedby']}
      />
    </div>
  );
}

/* ---------- Toolbar layout helpers ---------- */

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.toolbar, className)}>{children}</div>;
}

export const toolbarClasses = { grow: styles.toolbarGrow, spacer: styles.toolbarSpacer };
