'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ResumeUploader from '@/components/ResumeUploader';
import SkillEditor from '@/components/SkillEditor';
import IssueCard from '@/components/IssueCard';
import { Issue } from '@/types';
import { useProfileSkills } from '@/hooks/useProfileSkills';
import styles from './page.module.css';

interface ResumeAnalysis {
  skills: string[];
  technologies: string[];
  interests: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  confidence: number;
  source: 'fast' | 'ai' | 'hybrid';
}

interface RecommendedIssue extends Issue {
  matchScore: number;
  matchReasons: string[];
  repoLanguage?: string;
}

type PageState = 'upload' | 'review' | 'results' | 'loading';

export default function ResumePage() {
  const [pageState, setPageState] = useState<PageState>('upload');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [recommendedIssues, setRecommendedIssues] = useState<RecommendedIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Profile skills hook for persistence
  const { skills: profileSkills, hasSkills, saveResumeAnalysis, isLoggedIn, hasLoaded } = useProfileSkills();

  // If user has existing skills, offer to use them
  const [showExistingSkills, setShowExistingSkills] = useState(false);
  
  useEffect(() => {
    if (hasLoaded && hasSkills && pageState === 'upload') {
      setShowExistingSkills(true);
    }
  }, [hasLoaded, hasSkills, pageState]);

  const handleAnalysisComplete = (result: ResumeAnalysis) => {
    setAnalysis(result);
    setShowExistingSkills(false);
    setPageState('review');
  };
  
  // Use existing profile skills instead of uploading
  const useExistingSkills = () => {
    setAnalysis({
      skills: profileSkills.preferred_languages,
      technologies: profileSkills.technologies,
      interests: profileSkills.interests,
      experienceLevel: profileSkills.experience_level,
      confidence: 100,
      source: 'fast',
    });
    setShowExistingSkills(false);
    setPageState('review');
  };

  const handleSkillsUpdate = (updated: {
    skills: string[];
    technologies: string[];
    interests: string[];
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  }) => {
    if (analysis) {
      setAnalysis({
        ...analysis,
        ...updated,
      });
    }
  };

  const fetchRecommendations = async () => {
    if (!analysis) return;

    setPageState('loading');
    setError(null);
    
    // Save to profile if logged in
    if (isLoggedIn) {
      setSaveStatus('saving');
      const saved = await saveResumeAnalysis(analysis);
      setSaveStatus(saved ? 'saved' : 'error');
    }

    try {
      const response = await fetch('/api/issues/recommended', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: analysis.skills,
          technologies: analysis.technologies,
          interests: analysis.interests,
          experienceLevel: analysis.experienceLevel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations');
      }

      setRecommendedIssues(data.items || []);
      setPageState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      setPageState('review');
    }
  };

  const startOver = () => {
    setAnalysis(null);
    setRecommendedIssues([]);
    setError(null);
    setPageState('upload');
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <Link href="/discover" className={styles.backLink}>
            ← Back to Discover
          </Link>
          <h1 className={styles.title}>
            <span className={styles.emoji}>📄</span>
            Resume-Based Recommendations
          </h1>
          <p className={styles.subtitle}>
            {pageState === 'upload' && 'Upload your resume to find issues that match your skills'}
            {pageState === 'review' && 'Review and edit the extracted skills'}
            {pageState === 'loading' && 'Finding the best issues for you...'}
            {pageState === 'results' && `Found ${recommendedIssues.length} matching issues`}
          </p>
        </header>

        {/* Progress Steps */}
        <div className={styles.steps}>
          <div className={`${styles.step} ${pageState === 'upload' ? styles.stepActive : styles.stepDone}`}>
            <span className={styles.stepNumber}>1</span>
            <span className={styles.stepLabel}>Upload</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${pageState === 'review' ? styles.stepActive : pageState === 'results' || pageState === 'loading' ? styles.stepDone : ''}`}>
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepLabel}>Review</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${pageState === 'results' ? styles.stepActive : ''}`}>
            <span className={styles.stepNumber}>3</span>
            <span className={styles.stepLabel}>Match</span>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Upload State */}
          {pageState === 'upload' && (
            <>
              {/* Show existing skills option */}
              {showExistingSkills && (
                <div className={styles.existingSkillsCard}>
                  <div className={styles.existingSkillsIcon}>✨</div>
                  <h3>Use Your Saved Skills</h3>
                  <p>You have skills saved from a previous analysis. Would you like to use them?</p>
                  <div className={styles.existingSkillsPreview}>
                    <span>{profileSkills.preferred_languages.slice(0, 3).join(', ')}</span>
                    {profileSkills.preferred_languages.length > 3 && (
                      <span className={styles.moreTag}>+{profileSkills.preferred_languages.length - 3} more</span>
                    )}
                  </div>
                  <div className={styles.existingSkillsActions}>
                    <button 
                      className={styles.primaryBtn} 
                      onClick={useExistingSkills}
                    >
                      Use Saved Skills
                    </button>
                    <button 
                      className={styles.secondaryBtn}
                      onClick={() => setShowExistingSkills(false)}
                    >
                      Upload New Resume
                    </button>
                  </div>
                </div>
              )}
              
              {/* Resume uploader - show when not showing existing skills */}
              {!showExistingSkills && (
                <ResumeUploader
                  onAnalysisComplete={handleAnalysisComplete}
                  onError={setError}
                />
              )}
            </>
          )}

          {/* Review State */}
          {pageState === 'review' && analysis && (
            <div className={styles.reviewSection}>
              <SkillEditor
                skills={analysis.skills}
                technologies={analysis.technologies}
                interests={analysis.interests}
                experienceLevel={analysis.experienceLevel}
                confidence={analysis.confidence}
                onUpdate={handleSkillsUpdate}
              />
              
              {error && (
                <div className={styles.error}>
                  <span>⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              <div className={styles.actions}>
                <button className={styles.secondaryBtn} onClick={startOver}>
                  ← Upload Different Resume
                </button>
                <button 
                  className={styles.primaryBtn} 
                  onClick={fetchRecommendations}
                  disabled={analysis.skills.length === 0}
                >
                  Find Matching Issues →
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {pageState === 'loading' && (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner}></div>
              <p className={styles.loadingText}>Searching GitHub for matching issues...</p>
              <p className={styles.loadingSubtext}>This may take a few seconds</p>
            </div>
          )}

          {/* Results State */}
          {pageState === 'results' && (
            <div className={styles.resultsSection}>
              {/* Summary */}
              {analysis && (
                <div className={styles.resultsSummary}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Skills</span>
                    <span className={styles.summaryValue}>{analysis.skills.join(', ') || 'None'}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Level</span>
                    <span className={styles.summaryValue}>{analysis.experienceLevel}</span>
                  </div>
                  <button className={styles.editBtn} onClick={() => setPageState('review')}>
                    Edit Skills
                  </button>
                </div>
              )}

              {/* Issues Grid */}
              {recommendedIssues.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>😅</span>
                  <h3>No matching issues found</h3>
                  <p>Try adjusting your skills or broadening your interests</p>
                  <button className={styles.secondaryBtn} onClick={() => setPageState('review')}>
                    Edit Skills
                  </button>
                </div>
              ) : (
                <div className={styles.issuesGrid}>
                  {recommendedIssues.map((issue) => (
                    <div key={issue.id} className={styles.issueWrapper}>
                      {/* Match Score Badge */}
                      <div className={styles.matchBadge}>
                        <span className={styles.matchScore}>{issue.matchScore}%</span>
                        <span className={styles.matchLabel}>Match</span>
                      </div>
                      
                      {/* Match Reasons */}
                      {issue.matchReasons.length > 0 && (
                        <div className={styles.matchReasons}>
                          {issue.matchReasons.map((reason, idx) => (
                            <span key={idx} className={styles.reason}>✓ {reason}</span>
                          ))}
                        </div>
                      )}
                      
                      <IssueCard issue={issue} />
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className={styles.resultsActions}>
                <button className={styles.secondaryBtn} onClick={startOver}>
                  Upload New Resume
                </button>
                <Link href="/discover" className={styles.linkBtn}>
                  Browse All Issues
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
