'use client';

import { useState } from 'react';
import { POPULAR_LANGUAGES, CONTRIBUTION_LABELS } from '@/types';
import styles from './IssueFilterPanel.module.css';

export type IssuePreset = 'all' | 'recent' | 'good-first' | 'help-wanted' | 'top-repos';
export type IssueSortOption = 'created' | 'updated' | 'comments' | 'reactions';

interface IssueFilterPanelProps {
  selectedPreset: IssuePreset;
  onPresetChange: (preset: IssuePreset) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  selectedLabels: string[];
  onLabelsChange: (labels: string[]) => void;
  sortBy: IssueSortOption;
  onSortChange: (sort: IssueSortOption) => void;
  labelSearch: string;
  onLabelSearchChange: (search: string) => void;
}

const PRESETS: { value: IssuePreset; label: string; icon: string; description: string }[] = [
  { value: 'all', label: 'All Issues', icon: '📋', description: 'All open issues' },
  { value: 'recent', label: 'Recent', icon: '🕐', description: 'Newest issues' },
  { value: 'good-first', label: 'Good First', icon: '🌱', description: 'Beginner friendly' },
  { value: 'help-wanted', label: 'Help Wanted', icon: '🙋', description: 'Looking for help' },
  { value: 'top-repos', label: 'Top Repos', icon: '⭐', description: 'From popular repos' },
];

const SORT_OPTIONS: { value: IssueSortOption; label: string }[] = [
  { value: 'created', label: 'Newest First' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'comments', label: 'Most Comments' },
  { value: 'reactions', label: 'Most Reactions' },
];

export default function IssueFilterPanel({
  selectedPreset,
  onPresetChange,
  selectedLanguage,
  onLanguageChange,
  selectedLabels,
  onLabelsChange,
  sortBy,
  onSortChange,
  labelSearch,
  onLabelSearchChange,
}: IssueFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleLabel = (label: string) => {
    if (selectedLabels.includes(label)) {
      onLabelsChange(selectedLabels.filter((l) => l !== label));
    } else {
      onLabelsChange([...selectedLabels, label]);
    }
  };

  // Filter labels based on search
  const filteredLabels = CONTRIBUTION_LABELS.filter(label =>
    label.toLowerCase().includes(labelSearch.toLowerCase())
  );

  const hasActiveFilters = selectedPreset !== 'all' || selectedLanguage || selectedLabels.length > 0 || labelSearch;

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>🔍 Issue Filters</h3>
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
          {/* Preset Filters */}
          <div className={styles.section}>
            <label className={styles.label}>Quick Filters</label>
            <div className={styles.presets}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  className={`${styles.presetBtn} ${
                    selectedPreset === preset.value ? styles.presetBtnActive : ''
                  }`}
                  onClick={() => onPresetChange(preset.value)}
                  title={preset.description}
                >
                  <span className={styles.presetIcon}>{preset.icon}</span>
                  <span className={styles.presetLabel}>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className={styles.section}>
            <label className={styles.label}>Sort By</label>
            <select
              className={styles.select}
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as IssueSortOption)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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

          {/* Label Search */}
          <div className={styles.section}>
            <label className={styles.label}>Search Labels</label>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Type to search labels..."
              value={labelSearch}
              onChange={(e) => onLabelSearchChange(e.target.value)}
            />
          </div>

          {/* Label Tags */}
          <div className={styles.section}>
            <label className={styles.label}>Labels</label>
            <div className={styles.labels}>
              {filteredLabels.map((label) => (
                <button
                  key={label}
                  className={`${styles.labelBtn} ${
                    selectedLabels.includes(label) ? styles.labelBtnActive : ''
                  }`}
                  onClick={() => toggleLabel(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                onPresetChange('all');
                onLanguageChange('');
                onLabelsChange([]);
                onLabelSearchChange('');
                onSortChange('created');
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
