import { IconCheck } from '@/components/icons';
import { STEPS, type Step } from './flow';
import styles from './page.module.css';

/** Compact progress: "1 Upload — 2 Review skills — 3 Matches". */
export default function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex(step => step.id === current);

  return (
    <ol className={styles.steps} aria-label="Progress">
      {STEPS.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
        return (
          <li
            key={step.id}
            className={styles.stepItem}
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className={styles.stepMarker} aria-hidden="true">
              {state === 'done' ? <IconCheck size={12} /> : index + 1}
            </span>
            <span className={styles.stepLabel}>{step.label}</span>
            {state === 'done' && <span className="visually-hidden">(done)</span>}
          </li>
        );
      })}
    </ol>
  );
}
