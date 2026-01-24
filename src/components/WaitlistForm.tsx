'use client';

import { useState } from 'react';
import styles from '../app/page.module.css'; // Reuse main styles for simplicity or inline

interface WaitlistFormProps {
  waitlistCount?: number;
}

export default function WaitlistForm({ waitlistCount }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const displayedCount = waitlistCount ? waitlistCount.toLocaleString() : '1,200+';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to join waitlist');
    }
  };

  return (
    <div style={{ marginTop: '20px', maxWidth: '480px', width: '100%', margin: '0 auto' }}>
      {status === 'success' ? (
        <div className="fade-in" style={{ 
          padding: '16px 24px', 
          background: 'rgba(34, 197, 94, 0.1)', 
          border: '1px solid rgba(34, 197, 94, 0.3)', 
          borderRadius: '12px', 
          color: '#4ade80', 
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(34, 197, 94, 0.1)'
        }}>
          <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>✨</span>
          <span style={{ fontWeight: 500 }}>{message}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            width: '100%', 
            background: 'var(--color-bg-secondary)', // Adaptive background
            padding: '6px', 
            borderRadius: '14px', 
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <input
              type="email"
              placeholder="Enter your email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-primary)', // Fix for light mode
                fontSize: '1rem',
                outline: 'none',
                minWidth: '0'
              }}
              required
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className={`${styles.primaryBtn} ${styles.wompy}`}
              style={{ 
                padding: '12px 24px', 
                whiteSpace: 'nowrap', 
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 600,
                border: 'none',
                minWidth: '130px',
                cursor: status === 'loading' ? 'wait' : 'pointer'
              }}
            >
              {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
            </button>
          </div>
          {status === 'error' && (
            <span style={{ 
              color: '#f87171', 
              fontSize: '0.9rem', 
              marginTop: '8px',
              background: 'rgba(248, 113, 113, 0.1)',
              padding: '6px 12px',
              borderRadius: '20px'
            }}>
              {message}
            </span>
          )}
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            {displayedCount} people are in the queue.
          </p>
        </form>
      )}
    </div>
  );
}
