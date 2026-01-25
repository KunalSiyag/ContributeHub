'use client';

import { useState } from 'react';
import styles from './WaitlistForm.module.css';
import pageStyles from '../app/page.module.css';

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
    <div className={styles.formContainer}>
      {status === 'success' ? (
        <div className={styles.successMessage}>
          <span className={styles.icon}>✨</span>
          <span style={{ fontWeight: 500 }}>{message}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              type="email"
              placeholder="Enter your email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              className={styles.input}
              required
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className={`${pageStyles.primaryBtn} ${pageStyles.wompy} ${styles.submitBtn}`}
            >
              {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
            </button>
          </div>
          {status === 'error' && (
            <span className={styles.error}>
              {message}
            </span>
          )}
          <p className={styles.count}>
            {displayedCount} people are in the queue.
          </p>
        </form>
      )}
    </div>
  );
}
