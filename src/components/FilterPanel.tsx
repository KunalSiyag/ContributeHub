'use client';

import { useState } from 'react';
import { POPULAR_LANGUAGES, POPULAR_TOPICS } from '@/types';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  selectedTopics: string[];
  onTopicsChange: (topics: string[]) => void;
  minStars: number;
  onMinStarsChange: (stars: number) => void;
}

export default function FilterPanel({
  selectedLanguage,
  onLanguageChange,
  selectedTopics,
  onTopicsChange,
  minStars,
  onMinStarsChange,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      onTopicsChange(selectedTopics.filter((t) => t !== topic));
    } else {
      onTopicsChange([...selectedTopics, topic]);
    }
  };

  const starOptions = [
    { label: 'Any', value: 0 },
    { label: '100+', value: 100 },
    { label: '500+', value: 500 },
    { label: '1k+', value: 1000 },
    { label: '5k+', value: 5000 },
    { label: '10k+', value: 10000 },
  ];

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Filters</h3>
        <button
          className={styles.toggleBtn}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Collapse filters' : 'Expand filters'}
        >
          {isOpen ? '−' : '+'}
        </button>
      </div>

      {isOpen && (
        <div className={styles.content}>
          {/* Language Filter */}
          <div className={styles.section}>
            <label className={styles.label}>Language</label>
            <select
              className={styles.select}
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
            >
              <option value="">All Languages</option>
              {POPULAR_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Stars Filter */}
          <div className={styles.section}>
            <label className={styles.label}>Minimum Stars</label>
            <div className={styles.starOptions}>
              {starOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.starBtn} ${
                    minStars === option.value ? styles.starBtnActive : ''
                  }`}
                  onClick={() => onMinStarsChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topics Filter */}
          <div className={styles.section}>
            <label className={styles.label}>Topics</label>
            <div className={styles.topics}>
              {POPULAR_TOPICS.map((topic) => (
                <button
                  key={topic}
                  className={`${styles.topicBtn} ${
                    selectedTopics.includes(topic) ? styles.topicBtnActive : ''
                  }`}
                  onClick={() => toggleTopic(topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(selectedLanguage || selectedTopics.length > 0 || minStars > 0) && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                onLanguageChange('');
                onTopicsChange([]);
                onMinStarsChange(0);
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
