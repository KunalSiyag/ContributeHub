'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      
      // Get the code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const next = urlParams.get('next') || '/';
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription);
        setError(errorDescription || errorParam);
        setLoading(false);
        return;
      }

      if (code) {
        try {
          console.log('Exchanging code for session on client-side...');
          
          // Exchange code for session - this works because we're on the client
          // and can access localStorage where the code_verifier is stored
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Session exchange error:', exchangeError);
            setError(exchangeError.message);
            setLoading(false);
            return;
          }

          console.log('OAuth success! User:', data.user?.email);
          
          // Redirect to the intended page
          router.push(next);
          router.refresh();
        } catch (err) {
          console.error('Unexpected error during OAuth callback:', err);
          setError('An unexpected error occurred');
          setLoading(false);
        }
      } else {
        // No code in URL, try to get session from hash fragment (for implicit flow)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        if (session) {
          console.log('Session found:', session.user.email);
          router.push(next);
          router.refresh();
        } else {
          console.error('No code or session found');
          setError('No authentication code found');
          setLoading(false);
        }
      }
    };

    handleCallback();
  }, [router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#121212',
        color: '#fff',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(29, 185, 84, 0.3)',
          borderTop: '3px solid #1db954',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '16px', color: '#b3b3b3' }}>Completing sign in...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
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
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#ff4d4d', marginBottom: '12px' }}>Authentication Error</h2>
          <p style={{ color: '#b3b3b3', marginBottom: '16px' }}>{error}</p>
          <button
            onClick={() => router.push('/')}
            style={{
              background: '#1db954',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
