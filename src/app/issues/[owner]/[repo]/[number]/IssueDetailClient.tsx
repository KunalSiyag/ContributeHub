'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Issue } from '@/types';
import { timeAgo, getLabelColor } from '@/lib/utils';
import { calculateIssueBadges } from '@/lib/badges';
import { BadgeList } from '@/components/Badge';
import styles from './IssueDetail.module.css';

interface IssueDetailClientProps {
  owner: string;
  repo: string;
  issueNumber: number;
}

interface AIFixSuggestion {
  summary: string;
  steps: string[];
  skills: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  timeEstimate: string;
}

export default function IssueDetailClient({ owner, repo, issueNumber }: IssueDetailClientProps) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AIFixSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch issue details
  useEffect(() => {
    async function fetchIssue() {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
          {
            headers: {
              Accept: 'application/vnd.github+json',
            },
          }
        );
        
        if (!response.ok) {
          throw new Error('Issue not found');
        }
        
        const data = await response.json();
        setIssue(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load issue');
      } finally {
        setLoading(false);
      }
    }
    
    fetchIssue();
  }, [owner, repo, issueNumber]);

  // Generate AI suggestion
  const generateAISuggestion = async () => {
    if (!issue) return;
    
    setAiLoading(true);
    setAiError(null);
    
    try {
      const response = await fetch('/api/issues/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: issue.title,
          body: issue.body,
          labels: issue.labels.map(l => l.name),
          repo: `${owner}/${repo}`,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate suggestion');
      }
      
      const data = await response.json();
      setAiSuggestion(data);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate AI suggestion');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading issue details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.error}>
            <span>❌</span>
            <p>{error || 'Issue not found'}</p>
            <Link href="/discover" className={styles.backBtn}>
              Back to Discover
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const badges = calculateIssueBadges(issue);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/discover">Discover</Link>
          <span>/</span>
          <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer">
            {owner}/{repo}
          </a>
          <span>/</span>
          <span>#{issueNumber}</span>
        </nav>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.badges}>
            <BadgeList badges={badges} size="md" />
          </div>
          <h1 className={styles.title}>{issue.title}</h1>
          <div className={styles.meta}>
            <img
              src={issue.user.avatar_url}
              alt={issue.user.login}
              className={styles.avatar}
              width={32}
              height={32}
            />
            <span>
              Opened by <strong>{issue.user.login}</strong> {timeAgo(issue.created_at)}
            </span>
            <span className={`${styles.state} ${issue.state === 'open' ? styles.open : styles.closed}`}>
              {issue.state === 'open' ? '🟢 Open' : '🔴 Closed'}
            </span>
          </div>
        </header>

        <div className={styles.content}>
          {/* Main Content */}
          <main className={styles.main}>
            {/* Labels */}
            <div className={styles.labels}>
              {issue.labels.map((label: any) => (
                <span
                  key={label.id}
                  className={styles.label}
                  style={{
                    backgroundColor: `#${label.color}20`,
                    borderColor: `#${label.color}`,
                    color: `#${label.color}`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>

            {/* Issue Body */}
            <div className={styles.body}>
              <h2>Description</h2>
              {issue.body ? (
                <div className={styles.markdown}>
                  {issue.body}
                </div>
              ) : (
                <p className={styles.noBody}>No description provided.</p>
              )}
            </div>

            {/* Stats */}
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statIcon}>💬</span>
                <span className={styles.statValue}>{issue.comments}</span>
                <span className={styles.statLabel}>Comments</span>
              </div>
              {issue.reactions && (
                <div className={styles.stat}>
                  <span className={styles.statIcon}>👍</span>
                  <span className={styles.statValue}>{issue.reactions.total_count}</span>
                  <span className={styles.statLabel}>Reactions</span>
                </div>
              )}
            </div>
          </main>

          {/* Sidebar - AI Suggestion */}
          <aside className={styles.sidebar}>
            <div className={styles.aiCard}>
              <div className={styles.aiHeader}>
                <span className={styles.aiIcon}>🤖</span>
                <h3>AI Fix Suggestion</h3>
              </div>

              {aiSuggestion ? (
                <div className={styles.aiContent}>
                  <p className={styles.aiSummary}>{aiSuggestion.summary}</p>
                  
                  <div className={styles.aiSection}>
                    <h4>📋 Steps to Fix</h4>
                    <ol className={styles.aiSteps}>
                      {aiSuggestion.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className={styles.aiSection}>
                    <h4>🛠️ Skills Needed</h4>
                    <div className={styles.aiSkills}>
                      {aiSuggestion.skills.map((skill, i) => (
                        <span key={i} className={styles.skill}>{skill}</span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.aiMeta}>
                    <span className={`${styles.difficulty} ${styles[aiSuggestion.difficulty]}`}>
                      {aiSuggestion.difficulty === 'easy' ? '🟢' : aiSuggestion.difficulty === 'medium' ? '🟡' : '🔴'} {aiSuggestion.difficulty}
                    </span>
                    <span className={styles.time}>⏱️ {aiSuggestion.timeEstimate}</span>
                  </div>
                </div>
              ) : (
                <div className={styles.aiEmpty}>
                  <p>Get AI-powered suggestions on how to approach this issue.</p>
                  <button
                    onClick={generateAISuggestion}
                    disabled={aiLoading}
                    className={styles.aiBtn}
                  >
                    {aiLoading ? (
                      <>
                        <span className={styles.btnSpinner}></span>
                        Analyzing...
                      </>
                    ) : (
                      '✨ Generate Suggestion'
                    )}
                  </button>
                  {aiError && <p className={styles.aiError}>{aiError}</p>}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <a
                href={issue.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryBtn}
              >
                Open on GitHub →
              </a>
              <button className={styles.secondaryBtn}>
                💾 Save Issue
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
