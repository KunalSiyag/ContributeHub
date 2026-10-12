'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './controls.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Native <dialog> modal: focus trap, Escape and backdrop click close it. */
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
    >
      {open && (
        <div className={styles.dialogInner}>
          <div className={styles.dialogHeader}>
            <h2 id={titleId} className={styles.dialogTitle}>
              {title}
            </h2>
            {description && <p className={styles.dialogDescription}>{description}</p>}
          </div>
          {children && <div className={styles.dialogBody}>{children}</div>}
          {footer && <div className={styles.dialogFooter}>{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
