'use client';

import { useState, useEffect } from 'react';
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
  isOpen?: boolean;
  onToggleMenu?: (isOpen: boolean) => void;
}

const STATUS_OPTIONS: { value: IssueStatus; label: string; icon: string }[] = [
  { value: 'saved', label: 'Saved', icon: '⭐' },
  { value: 'ongoing', label: 'Working on', icon: '🔧' },
  { value: 'pr_submitted', label: 'PR Submitted', icon: '🚀' },
  { value: 'completed', label: 'Completed', icon: '✅' },
];

export default function IssueActions({ issue, initialStatus, onStatusChange, isOpen, onToggleMenu }: IssueActionsProps) {
  const { user } = useAuth();
  const { saveIssue, updateStatus, removeIssue, isIssueTracked, loading } = useIssueManagement();
  const [status, setStatus] = useState<IssueStatus | null>(initialStatus || null);
  const [issueId, setIssueId] = useState<string | null>(null);
  
  const [localShowMenu, setLocalShowMenu] = useState(false);
  const showMenu = isOpen !== undefined ? isOpen : localShowMenu;

  const toggleMenu = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const newState = !showMenu;
    if (onToggleMenu) onToggleMenu(newState);
    else setLocalShowMenu(newState);
  };

  const closeMenu = () => {
    if (onToggleMenu) onToggleMenu(false);
    else setLocalShowMenu(false);
  };

  const [checking, setChecking] = useState(false);

  // Check if issue is already tracked when component mounts
  useEffect(() => {
    const checkTracked = async () => {
      if (!user || !issue.url) return;
      
      setChecking(true);
      try {
        const tracked = await isIssueTracked(issue.url);
        if (tracked) {
          setIssueId(tracked.id);
          setStatus(tracked.status as IssueStatus);
        }
      } catch (err) {
        console.error('Error checking if issue is tracked:', err);
      } finally {
        setChecking(false);
      }
    };

    checkTracked();
  }, [user, issue.url, isIssueTracked]);

  const handleSave = async () => {
    console.log('IssueActions: handleSave called', { issue, user: !!user });
    if (!user) {
      console.log('IssueActions: No user logged in');
      return;
    }
    
    try {
      const result = await saveIssue(issue);
      console.log('IssueActions: saveIssue result', result);
      
      if (result) {
        setIssueId(result.id);
        setStatus('saved');
        onStatusChange?.('saved');
      } else {
        console.error('IssueActions: saveIssue returned null');
      }
    } catch (err) {
      console.error('IssueActions: Error in handleSave', err);
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
    closeMenu();
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
    closeMenu();
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
        <div className={styles.statusDropdown} style={{ display: 'flex' }}>
          <button 
            className={`${styles.statusBtn} ${styles[status]}`}
            onClick={status === 'saved' ? handleRemove : toggleMenu}
            style={{ 
              borderTopRightRadius: 0, 
              borderBottomRightRadius: 0, 
              borderRight: '1px solid rgba(0,0,0,0.1)',
              paddingRight: '8px' 
            }}
            title={status === 'saved' ? "Click to unsave" : "Change status"}
          >
            <span>{currentStatus?.icon}</span>
            <span>{currentStatus?.label}</span>
          </button>
          <button
             className={`${styles.statusBtn} ${styles[status]}`}
             onClick={toggleMenu}
             style={{ 
               borderTopLeftRadius: 0, 
               borderBottomLeftRadius: 0, 
               paddingLeft: '6px', 
               paddingRight: '8px' 
             }}
             aria-label="Open status menu"
          >
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
              <button 
                className={styles.removeBtn} 
                onClick={handleRemove}
                title="Stop tracking this issue"
              >
                🗑️ Unsave
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
