'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      width: '100%',
      padding: '2rem',
      borderTop: '1px solid var(--color-border)',
      background: 'var(--color-bg-primary)',
      marginTop: 'auto',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'var(--color-text-secondary)',
      fontSize: '0.9rem'
    }}>
      <p>
        Made with <span style={{ color: '#ef4444' }}>❤️</span> by{' '}
        <a 
          href="https://x.com/dazzbuilds" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            color: 'var(--color-text-primary)', 
            textDecoration: 'none',
            fontWeight: 500 
          }}
          className="hover:text-primary"
        >
          @dazzbuilds
        </a>
      </p>
    </footer>
  );
}
