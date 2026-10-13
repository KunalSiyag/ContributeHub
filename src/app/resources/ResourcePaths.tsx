import Link from 'next/link';
import { IconArrowRight, IconArrowUpRight } from '@/components/icons';
import { RESOURCE_PATHS, type ResourcePathStep } from '@/lib/resources';
import styles from './page.module.css';

function StepTitle({ step }: { step: ResourcePathStep }) {
  if (!step.href) return <span className={styles.stepTitle}>{step.title}</span>;

  if (step.href.startsWith('/')) {
    return (
      <Link href={step.href} className={`${styles.stepTitle} ${styles.stepLink}`}>
        {step.title}
        <IconArrowRight size={12} className={styles.stepIcon} />
      </Link>
    );
  }

  return (
    <a href={step.href} target="_blank" rel="noopener noreferrer" className={`${styles.stepTitle} ${styles.stepLink}`}>
      {step.title}
      <IconArrowUpRight size={12} className={styles.stepIcon} />
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

/** Guided paths: each an ordered list of steps in one panel. */
export default function ResourcePaths() {
  return (
    <div className={styles.paths}>
      <div className={styles.pathGrid}>
        {RESOURCE_PATHS.map(path => (
          <article key={path.id} id={path.id} className={styles.path}>
            <header className={styles.pathHeader}>
              <div className={styles.pathTitleRow}>
                <h3 className={styles.pathTitle}>{path.title}</h3>
                <span className={styles.pathCount}>{path.steps.length} steps</span>
              </div>
              <p className={styles.pathSummary}>{path.summary}</p>
            </header>
            <ol className={styles.steps}>
              {path.steps.map((step, index) => (
                <li key={step.title} className={[styles.step, step.href && styles.stepLinked].filter(Boolean).join(' ')}>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className={styles.stepBody}>
                    <StepTitle step={step} />
                    <p className={styles.stepText}>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </div>
  );
}
