'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main className="page-wrapper" style={{ flex: 1 }}>
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.appLayout}>
      {/* Global Photogenic Background */}
      <div className="photogenic-wrapper">
        <div className="blur-blob blob-1"></div>
        <div className="blur-blob blob-2"></div>
        <div className="blur-blob blob-3"></div>
      </div>
      
      <Sidebar />
      <div className={styles.mainContent} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}
