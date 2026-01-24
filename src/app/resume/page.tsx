'use client';

import Link from 'next/link';

export default function ResumePage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '80vh',
      textAlign: 'center',
      padding: '20px',
      gap: '20px' 
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '10px' }}>📄</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(to right, #a78bfa, #2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Resume Based Recommendations
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', fontSize: '1.1rem', lineHeight: '1.6' }}>
        Upload your resume and let our AI analyze your skills to find the perfect open source issues for you.
      </p>
      
      <div style={{ 
        padding: '10px 20px', 
        background: 'var(--color-bg-secondary)', 
        border: '1px solid var(--color-border)', 
        borderRadius: '30px', 
        color: 'var(--color-primary)',
        fontWeight: 600
      }}>
        🚧 Coming Soon
      </div>
      
      <Link href="/discover" style={{ marginTop: '20px', color: 'var(--color-text-tertiary)', textDecoration: 'underline' }}>
        Back to Discover
      </Link>
    </div>
  );
}
