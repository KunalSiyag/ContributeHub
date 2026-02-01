'use client';

import { useState } from 'react';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
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
      {/* Global Photogenic Background - Fixed position, so it doesn't affect flow */}
      <div className="photogenic-wrapper">
        <div className="blur-blob blob-1"></div>
        <div className="blur-blob blob-2"></div>
        <div className="blur-blob blob-3"></div>
      </div>
      
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={setSidebarCollapsed} 
      />
      
      <div 
        className={styles.mainContent} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          // Pass dynamic width as CSS variable so media queries can override it
          ['--dynamic-sidebar-width' as any]: sidebarCollapsed ? '64px' : '240px'
        }}
      >
        <div style={{ flex: 1, width: '100%' }}>
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}
