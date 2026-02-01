import styles from '@/components/HexagonLoader.module.css';

export default function Loading() {
  // Static version for Suspense boundaries
  return (
    <div className={styles.container} style={{ position: 'relative', height: '100vh' }}>
      <div className={styles.loader}>
        <div className={styles.hexagonWrapper}>
          <div className={styles.ripple}></div>
          <div className={styles.ripple}></div>
          <span className={styles.hexagon}>⬡</span>
        </div>
        <div className={styles.text}>LOADING...</div>
      </div>
    </div>
  );
}
