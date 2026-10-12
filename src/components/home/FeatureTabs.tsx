'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './home.module.css';

export interface FeatureTab {
  id: string;
  label: string;
  caption: string;
  icon: ReactNode;
  /** Server-rendered panel (copy and live visual). */
  panel: ReactNode;
}

/** Icon tiles that switch the feature panel below (ARIA tabs, arrow keys move). */
export default function FeatureTabs({ tabs }: { tabs: FeatureTab[] }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const select = (index: number, focus = false) => {
    setActive(index);
    if (focus) listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = tabs.length - 1;
    if (event.key === 'ArrowRight') select(active === last ? 0 : active + 1, true);
    else if (event.key === 'ArrowLeft') select(active === 0 ? last : active - 1, true);
    else if (event.key === 'Home') select(0, true);
    else if (event.key === 'End') select(last, true);
    else return;
    event.preventDefault();
  };

  return (
    <div className={styles.features}>
      <div ref={listRef} role="tablist" aria-label="Orion features" className={styles.featureTabs} onKeyDown={onKeyDown}>
        {tabs.map((tab, index) => {
          const selected = index === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={styles.featureTab}
              onClick={() => select(index)}
            >
              <span className={styles.featureIcon}>{tab.icon}</span>
              <span className={styles.featureLabel}>{tab.label}</span>
              <span className={styles.featureCaption}>{tab.caption}</span>
            </button>
          );
        })}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={index !== active}
          className={styles.featurePanel}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
