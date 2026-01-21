'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIssueManagement, IssueStatus } from '@/hooks/useIssueManagement';
import styles from './IssueActions.module.css';

interface IssueActionsProps {
  issue: {
    url: string;
    number: number;
    repo: string;
    title: string;
    description?: string;
    labels?: string[];
    hasBounty?: boolean;
    bountyAmount?: string;
  };
  initialStatus?: IssueStatus | null;
  onStatusChange?: (status: IssueStatus | null) => void;
}

const STATUS_OPTIONS: { value: IssueStatus; label: string; icon: string }[] = [
  { value: 'saved', label: 'Saved', icon: '⭐' },
  { value: 'ongoing', label: 'Working on', icon: '🔧' },
  { value: 'pr_submitted', label: 'PR Submitted', icon: '🚀' },
  { value: 'completed', label: 'Completed', icon: '✅' },
];

export default function IssueActions({ issue, initialStatus, onStatusChange }: IssueActionsProps) {
  const { user } = useAuth();
  const { saveIssue, updateStatus, removeIssue, loading } = useIssueManagement();
  const [status, setStatus] = useState<IssueStatus | null>(initialStatus || null);
  const [issueId, setIssueId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleSave = async () => {
    const result = await saveIssue(issue);
    if (result) {
      setIssueId(result.id);
      setStatus('saved');
      onStatusChange?.('saved');
    }
  };

  const handleStatusChange = async (newStatus: IssueStatus) => {
    if (!issueId && status === null) {
      // First save with this status
      const result = await saveIssue(issue);
      if (result) {
        setIssueId(result.id);
        await updateStatus(result.id, newStatus);
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      }
    } else if (issueId) {
      const success = await updateStatus(issueId, newStatus);
      if (success) {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      }
    }
    setShowMenu(false);
  };

  const handleRemove = async () => {
    if (issueId) {
      const success = await removeIssue(issueId);
      if (success) {
        setStatus(null);
        setIssueId(null);
        onStatusChange?.(null);
      }
    }
    setShowMenu(false);
  };

  if (!user) {
    return (
      <button className={styles.loginPrompt} disabled>
        Login to track
      </button>
    );
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === status);

  return (
    <div className={styles.container}>
      {status === null ? (
        <button 
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '...' : '⭐ Save'}
        </button>
      ) : (
        <div className={styles.statusDropdown}>
          <button 
            className={`${styles.statusBtn} ${styles[status]}`}
            onClick={() => setShowMenu(!showMenu)}
          >
            <span>{currentStatus?.icon}</span>
            <span>{currentStatus?.label}</span>
            <span className={styles.chevron}>▼</span>
          </button>
          
          {showMenu && (
            <div className={styles.menu}>
              {STATUS_OPTIONS.map(option => (
                <button
                  key={option.value}
                  className={`${styles.menuItem} ${status === option.value ? styles.active : ''}`}
                  onClick={() => handleStatusChange(option.value)}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
              <div className={styles.menuDivider} />
              <button className={styles.removeBtn} onClick={handleRemove}>
                🗑️ Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
