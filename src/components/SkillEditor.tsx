'use client';

import { useState } from 'react';
import styles from './SkillEditor.module.css';

interface SkillEditorProps {
  skills: string[];
  technologies: string[];
  interests: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  confidence: number;
  onUpdate: (data: {
    skills: string[];
    technologies: string[];
    interests: string[];
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  }) => void;
}

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: '🌱 Beginner', description: 'New to open source' },
  { value: 'intermediate', label: '🌿 Intermediate', description: '2-5 years experience' },
  { value: 'advanced', label: '🌳 Advanced', description: '5+ years, senior level' },
] as const;

export default function SkillEditor({
  skills,
  technologies,
  interests,
  experienceLevel,
  confidence,
  onUpdate,
}: SkillEditorProps) {
  const [newSkill, setNewSkill] = useState('');
  const [newTech, setNewTech] = useState('');
  const [activeTab, setActiveTab] = useState<'skills' | 'tech' | 'interests'>('skills');

  const removeSkill = (skill: string) => {
    onUpdate({
      skills: skills.filter((s) => s !== skill),
      technologies,
      interests,
      experienceLevel,
    });
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      onUpdate({
        skills: [...skills, newSkill.trim()],
        technologies,
        interests,
        experienceLevel,
      });
      setNewSkill('');
    }
  };

  const removeTech = (tech: string) => {
    onUpdate({
      skills,
      technologies: technologies.filter((t) => t !== tech),
      interests,
      experienceLevel,
    });
  };

  const addTech = () => {
    if (newTech.trim() && !technologies.includes(newTech.trim())) {
      onUpdate({
        skills,
        technologies: [...technologies, newTech.trim()],
        interests,
        experienceLevel,
      });
      setNewTech('');
    }
  };

  const toggleInterest = (interest: string) => {
    const newInterests = interests.includes(interest)
      ? interests.filter((i) => i !== interest)
      : [...interests, interest];
    onUpdate({
      skills,
      technologies,
      interests: newInterests,
      experienceLevel,
    });
  };

  const setLevel = (level: 'beginner' | 'intermediate' | 'advanced') => {
    onUpdate({
      skills,
      technologies,
      interests,
      experienceLevel: level,
    });
  };

  const availableInterests = [
    'web', 'mobile', 'backend', 'frontend', 'devops', 
    'machine-learning', 'security', 'blockchain', 'database',
    'api', 'testing', 'documentation', 'cli'
  ];

  return (
    <div className={styles.container}>
      {/* Confidence Indicator */}
      <div className={styles.confidenceBar}>
        <div className={styles.confidenceLabel}>
          <span>Analysis Confidence</span>
          <span className={styles.confidenceValue}>{confidence}%</span>
        </div>
        <div className={styles.confidenceTrack}>
          <div 
            className={styles.confidenceFill} 
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Experience Level */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Experience Level</h3>
        <div className={styles.experienceGrid}>
          {EXPERIENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`${styles.experienceBtn} ${
                experienceLevel === option.value ? styles.experienceBtnActive : ''
              }`}
              onClick={() => setLevel(option.value)}
            >
              <span className={styles.expLabel}>{option.label}</span>
              <span className={styles.expDesc}>{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'skills' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          Languages ({skills.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'tech' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('tech')}
        >
          Technologies ({technologies.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'interests' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('interests')}
        >
          Interests ({interests.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'skills' && (
          <>
            <div className={styles.tags}>
              {skills.map((skill) => (
                <span key={skill} className={styles.tag}>
                  {skill}
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <p className={styles.empty}>No languages detected</p>
              )}
            </div>
            <div className={styles.addRow}>
              <input
                type="text"
                placeholder="Add a language..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                className={styles.addInput}
              />
              <button className={styles.addBtn} onClick={addSkill}>
                + Add
              </button>
            </div>
          </>
        )}

        {activeTab === 'tech' && (
          <>
            <div className={styles.tags}>
              {technologies.map((tech) => (
                <span key={tech} className={styles.tag}>
                  {tech}
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeTech(tech)}
                    aria-label={`Remove ${tech}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {technologies.length === 0 && (
                <p className={styles.empty}>No technologies detected</p>
              )}
            </div>
            <div className={styles.addRow}>
              <input
                type="text"
                placeholder="Add a technology..."
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTech()}
                className={styles.addInput}
              />
              <button className={styles.addBtn} onClick={addTech}>
                + Add
              </button>
            </div>
          </>
        )}

        {activeTab === 'interests' && (
          <div className={styles.interestGrid}>
            {availableInterests.map((interest) => (
              <button
                key={interest}
                className={`${styles.interestBtn} ${
                  interests.includes(interest) ? styles.interestBtnActive : ''
                }`}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
