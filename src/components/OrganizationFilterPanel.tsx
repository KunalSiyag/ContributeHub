'use client';

import { useState } from 'react';
import styles from './FilterPanel.module.css'; // Reusing existing styles for consistency

interface OrganizationFilterPanelProps {
  years: number[];
  selectedYears: number[];
  onYearsChange: (years: number[]) => void;
  matchAll: boolean;
  onMatchAllChange: (matchAll: boolean) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

const SORT_OPTIONS = [
  { value: 'years-desc', label: 'Most Years Participated' },
  { value: 'years-asc', label: 'Fewest Years Participated' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'relevance', label: 'Relevance (Default)' },
];

export default function OrganizationFilterPanel({
  years,
  selectedYears,
  onYearsChange,
  matchAll,
  onMatchAllChange,
  sortBy,
  onSortChange,
}: OrganizationFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      onYearsChange(selectedYears.filter(y => y !== year));
    } else {
      onYearsChange([...selectedYears, year]);
    }
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>🔍 Organization Filters</h3>
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
          
          {/* Sort By */}
          <div className={styles.section}>
            <label className={styles.label}>Sort By</label>
            <select
              className={styles.select}
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Participation Years */}
          <div className={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className={styles.label} style={{ marginBottom: 0 }}>Participation Years</label>
              {selectedYears.length > 1 && (
                <label className={styles.toggleLabel} style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={matchAll} 
                    onChange={(e) => onMatchAllChange(e.target.checked)}
                    style={{ marginRight: '4px' }}
                  />
                  Match All
                </label>
              )}
            </div>
            
            <div className={styles.scrollableList} style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {years.map((year) => (
                <label key={year} className={styles.checkboxItem} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedYears.includes(year)}
                    onChange={() => toggleYear(year)}
                    style={{ marginRight: '8px' }}
                  />
                  {year}
                </label>
              ))}
            </div>
          </div>

          {/* Clear Buttons */}
          {selectedYears.length > 0 && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                onYearsChange([]);
                onSortChange('relevance');
                onMatchAllChange(false);
              }}
            >
              Clear Filters
            </button>
          )}

        </div>
      )}
    </aside>
  );
}
