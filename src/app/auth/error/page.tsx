'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'An authentication error occurred';

  // Function to clear all Supabase cookies and retry login
  const handleRetryLogin = () => {
    // Clear ALL Supabase-related cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const cookieName = cookie.split('=')[0].trim();
      if (cookieName.startsWith('sb-') || cookieName.includes('supabase') || cookieName.includes('pkce')) {
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    }
    // Redirect to home and let user click login again
    window.location.href = '/';
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#121212',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'rgba(255, 77, 77, 0.1)',
        border: '1px solid rgba(255, 77, 77, 0.3)',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '450px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
        <h1 style={{ 
          color: '#ff6b6b', 
          marginBottom: '16px',
          fontSize: '1.5rem',
          fontWeight: 600
        }}>
          Authentication Error
        </h1>
        <p style={{ 
          color: '#b3b3b3', 
          marginBottom: '24px',
          lineHeight: 1.6
        }}>
          {error}
        </p>
        <p style={{
          color: '#666',
          fontSize: '0.875rem',
          marginBottom: '24px'
        }}>
          This usually happens when there are stale cookies. Click the button below to clear them and try again.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleRetryLogin}
            style={{
              background: '#1db954',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '24px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Clear Cookies & Retry
          </button>
          <Link
            href="/"
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid #333',
              padding: '12px 24px',
              borderRadius: '24px',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#121212',
        color: '#fff'
      }}>
        Loading...
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
