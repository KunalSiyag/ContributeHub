'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  
  // Homepage uses top nav only, other pages use sidebar
  const isHomepage = pathname === '/';

  if (isHomepage) {
    return (
      <>
        <Header />
        <main className="page-wrapper">
          {children}
        </main>
      </>
    );
  }

  return (
    <div className={styles.appLayout}>
      <Sidebar />
      <div className={styles.mainContent}>
        {children}
      </div>
    </div>
  );
}
