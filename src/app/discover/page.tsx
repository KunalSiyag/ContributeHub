'use client';

import { useState, useEffect, useCallback } from 'react';
import { Repository, Issue, RepositoryFilters, IssueFilters } from '@/types';
import { getStoredPreferences, defaultPreferences } from '@/lib/utils';
import { calculateMatchScore } from '@/lib/github';
import ProjectCard from '@/components/ProjectCard';
import IssueCard from '@/components/IssueCard';
import FilterPanel from '@/components/FilterPanel';
import SearchBar from '@/components/SearchBar';
import styles from './page.module.css';

type TabType = 'projects' | 'issues';

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [repos, setRepos] = useState<Repository[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [minStars, setMinStars] = useState(0);
  
  // User preferences for match scoring
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  // Load user preferences
  useEffect(() => {
    const prefs = getStoredPreferences() || defaultPreferences;
    setUserSkills(prefs.skills);
    setUserInterests(prefs.interests);
    
    // Check URL for tab parameter
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'issues') {
      setActiveTab('issues');
    }
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'projects') {
        const filters: RepositoryFilters = {
          query: searchQuery,
          language: selectedLanguage || undefined,
          minStars: minStars || undefined,
          topics: selectedTopics.length > 0 ? selectedTopics : undefined,
          perPage: 20,
        };

        const response = await fetch('/api/repositories?' + new URLSearchParams({
          query: filters.query || '',
          language: filters.language || '',
          minStars: String(filters.minStars || 0),
          topics: filters.topics?.join(',') || '',
        }));

        if (!response.ok) throw new Error('Failed to fetch repositories');
        
        const data = await response.json();
        setRepos(data.items || []);
      } else {
        const filters: IssueFilters = {
          labels: ['good first issue'],
          language: selectedLanguage || undefined,
          perPage: 20,
        };

        const response = await fetch('/api/issues?' + new URLSearchParams({
          labels: filters.labels?.join(',') || 'good first issue',
          language: filters.language || '',
        }));

        if (!response.ok) throw new Error('Failed to fetch issues');
        
        const data = await response.json();
        setIssues(data.items || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, selectedLanguage, selectedTopics, minStars]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate match scores for repos
  const reposWithScores = repos.map(repo => ({
    repo,
    matchScore: calculateMatchScore(repo, userSkills, userInterests),
  }));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h1>Discover</h1>
            <p>Find open source projects and issues that match your skills</p>
          </div>
          <SearchBar
            placeholder={activeTab === 'projects' ? 'Search projects...' : 'Search issues...'}
            onSearch={setSearchQuery}
          />
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'projects' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            📁 Projects
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'issues' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('issues')}
          >
            ✨ Issues
          </button>
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          {/* Sidebar Filters */}
          <FilterPanel
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            selectedTopics={selectedTopics}
            onTopicsChange={setSelectedTopics}
            minStars={minStars}
            onMinStarsChange={setMinStars}
          />

          {/* Results */}
          <div className={styles.results}>
            {loading && (
              <div className={styles.loadingGrid}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={styles.skeleton}></div>
                ))}
              </div>
            )}

            {error && (
              <div className={styles.error}>
                <span className={styles.errorIcon}>⚠️</span>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={fetchData}>
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && activeTab === 'projects' && (
              <>
                {repos.length === 0 ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>📭</span>
                    <h3>No projects found</h3>
                    <p>Try adjusting your filters or search query</p>
                  </div>
                ) : (
                  <div className={styles.grid}>
                    {reposWithScores.map(({ repo, matchScore }) => (
                      <ProjectCard
                        key={repo.id}
                        repo={repo}
                        matchScore={userSkills.length > 0 ? matchScore : undefined}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {!loading && !error && activeTab === 'issues' && (
              <>
                {issues.length === 0 ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>📭</span>
                    <h3>No issues found</h3>
                    <p>Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className={styles.issueGrid}>
                    {issues.map((issue) => (
                      <IssueCard key={issue.id} issue={issue} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
