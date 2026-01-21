'use client';

import { useState, useEffect } from 'react';
import { POPULAR_LANGUAGES, POPULAR_TOPICS, EXPERIENCE_LEVELS, ExperienceLevel } from '@/types';
import { getStoredPreferences, setStoredPreferences, defaultPreferences } from '@/lib/utils';
import styles from './page.module.css';

export default function PreferencesPage() {
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    setMounted(true);
    const prefs = getStoredPreferences() || defaultPreferences;
    setSkills(prefs.skills);
    setInterests(prefs.interests);
    setExperienceLevel(prefs.experienceLevel);
  }, []);

  const toggleSkill = (skill: string) => {
    setSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
    setSaved(false);
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
    setSaved(false);
  };

  const handleSave = () => {
    setStoredPreferences({
      skills,
      interests,
      experienceLevel,
      minStars: EXPERIENCE_LEVELS[experienceLevel].starRange[0],
      preferredLanguages: skills,
      theme: 'system',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!mounted) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading preferences...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Your Preferences</h1>
          <p>Tell us about your skills and interests to get personalized project recommendations</p>
        </div>

        {/* Experience Level */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Experience Level</h2>
          <p className={styles.sectionDesc}>How experienced are you with open source contributions?</p>
          <div className={styles.experienceGrid}>
            {(Object.keys(EXPERIENCE_LEVELS) as ExperienceLevel[]).map((level) => (
              <button
                key={level}
                className={`${styles.experienceCard} ${experienceLevel === level ? styles.experienceCardActive : ''}`}
                onClick={() => {
                  setExperienceLevel(level);
                  setSaved(false);
                }}
              >
                <span className={styles.experienceIcon}>
                  {level === 'beginner' ? '🌱' : level === 'intermediate' ? '🌿' : '🌳'}
                </span>
                <h3>{EXPERIENCE_LEVELS[level].label}</h3>
                <p>{EXPERIENCE_LEVELS[level].description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Programming Languages */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Programming Languages</h2>
          <p className={styles.sectionDesc}>Select the languages you&apos;re comfortable with</p>
          <div className={styles.skillGrid}>
            {POPULAR_LANGUAGES.map((lang) => (
              <button
                key={lang}
                className={`${styles.skillBtn} ${skills.includes(lang) ? styles.skillBtnActive : ''}`}
                onClick={() => toggleSkill(lang)}
              >
                {lang}
                {skills.includes(lang) && <span className={styles.checkmark}>✓</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Interests */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Areas of Interest</h2>
          <p className={styles.sectionDesc}>What topics are you interested in?</p>
          <div className={styles.topicGrid}>
            {POPULAR_TOPICS.map((topic) => (
              <button
                key={topic}
                className={`${styles.topicBtn} ${interests.includes(topic) ? styles.topicBtnActive : ''}`}
                onClick={() => toggleInterest(topic)}
              >
                {topic}
                {interests.includes(topic) && <span className={styles.checkmark}>✓</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Summary */}
        <section className={styles.summary}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryStats}>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{skills.length}</span>
                <span className={styles.statLabel}>Languages</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{interests.length}</span>
                <span className={styles.statLabel}>Interests</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{EXPERIENCE_LEVELS[experienceLevel].label}</span>
                <span className={styles.statLabel}>Level</span>
              </div>
            </div>
            <button
              className={`btn btn-primary btn-lg ${styles.saveBtn}`}
              onClick={handleSave}
            >
              {saved ? '✓ Saved!' : 'Save Preferences'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
