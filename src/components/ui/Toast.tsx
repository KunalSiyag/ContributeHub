'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconAlert, IconCheckCircle, IconX } from '../icons';
import styles from './controls.module.css';

type Tone = 'default' | 'success' | 'error';

interface ToastOptions {
  tone?: Tone;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastEntry extends ToastOptions {
  id: number;
  message: ReactNode;
}

interface ToastContextValue {
  toast: (message: ReactNode, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const MAX_TOASTS = 3;

interface Timer {
  /** Pending dismissal, or null while paused. */
  handle: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);
  // One timer per visible toast, in display order.
  const timers = useRef(new Map<number, Timer>());
  // Timers pause while a toast is hovered or focused, so there is time to reach "Undo".
  const hold = useRef({ hover: false, focus: false });

  const dismiss = useCallback((id: number) => {
    setEntries(list => list.filter(entry => entry.id !== id));
    const timer = timers.current.get(id);
    if (timer?.handle) clearTimeout(timer.handle);
    timers.current.delete(id);
  }, []);

  const schedule = useCallback(
    (id: number, remaining: number) => {
      const paused = hold.current.hover || hold.current.focus;
      timers.current.set(id, {
        handle: paused ? null : setTimeout(() => dismiss(id), remaining),
        remaining,
        startedAt: Date.now(),
      });
    },
    [dismiss]
  );

  const setHold = useCallback(
    (kind: 'hover' | 'focus', on: boolean) => {
      const wasHeld = hold.current.hover || hold.current.focus;
      hold.current = { ...hold.current, [kind]: on };
      const held = hold.current.hover || hold.current.focus;
      if (held === wasHeld) return;
      for (const [id, timer] of timers.current) {
        if (timer.handle) clearTimeout(timer.handle);
        // Pausing keeps what was left; resuming leaves a moment to finish reading.
        const remaining = held
          ? Math.max(timer.remaining - (Date.now() - timer.startedAt), 0)
          : Math.max(timer.remaining, 1500);
        schedule(id, remaining);
      }
    },
    [schedule]
  );

  // A toast removed by its own buttons can't report pointer-leave or blur.
  const release = useCallback(() => {
    setHold('hover', false);
    setHold('focus', false);
  }, [setHold]);

  const toast = useCallback(
    (message: ReactNode, options: ToastOptions = {}) => {
      const id = nextId.current++;
      setEntries(list => [...list.slice(1 - MAX_TOASTS), { id, message, ...options }]);
      // Nothing on screen means nothing can be hovered or focused.
      if (timers.current.size === 0) hold.current = { hover: false, focus: false };
      schedule(id, options.duration ?? (options.action ? 6000 : 3500));
      // Keep timers in step with the toasts still on screen.
      for (const oldest of timers.current.keys()) {
        if (timers.current.size <= MAX_TOASTS) break;
        const evicted = timers.current.get(oldest);
        if (evicted?.handle) clearTimeout(evicted.handle);
        timers.current.delete(oldest);
      }
    },
    [schedule]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className={styles.toastRegion}
        role="status"
        aria-live="polite"
        onPointerEnter={() => setHold('hover', true)}
        onPointerLeave={() => setHold('hover', false)}
        onFocus={() => setHold('focus', true)}
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHold('focus', false);
        }}
      >
        {entries.map(entry => (
          <div
            key={entry.id}
            className={[
              styles.toast,
              entry.tone === 'success' && styles.toastSuccess,
              entry.tone === 'error' && styles.toastError,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {entry.tone && entry.tone !== 'default' && (
              <span className={styles.toastIcon}>
                {entry.tone === 'success' ? <IconCheckCircle size={15} /> : <IconAlert size={15} />}
              </span>
            )}
            <span className={styles.toastMessage}>{entry.message}</span>
            {entry.action && (
              <button
                type="button"
                className={styles.toastAction}
                onClick={() => {
                  entry.action?.onClick();
                  dismiss(entry.id);
                  release();
                }}
              >
                {entry.action.label}
              </button>
            )}
            <button
              type="button"
              className={styles.toastClose}
              onClick={() => {
                dismiss(entry.id);
                release();
              }}
              aria-label="Dismiss"
            >
              <IconX size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
