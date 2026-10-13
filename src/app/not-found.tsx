import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <span className="eyebrow">404</span>
      <h1 className={styles.title}>This page doesn&rsquo;t exist</h1>
      <p className={styles.body}>
        The link may be broken, or the page moved. Program pages use the edition in their address, such as{' '}
        <code>/events/gsoc-2027</code>.
      </p>
      <div className={styles.actions}>
        <Link href="/" className={buttonClass({ variant: 'primary' })}>
          Go home
        </Link>
        <Link href="/discover" className={buttonClass({ variant: 'secondary' })}>
          Discover issues
        </Link>
        <Link href="/events" className={buttonClass({ variant: 'ghost' })}>
          Programs
        </Link>
      </div>
    </div>
  );
}
