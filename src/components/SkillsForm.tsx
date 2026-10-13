'use client';

import { useId } from 'react';
import { ChipInput, Field } from './ui/Field';
import { Pill, Pills, Segmented } from './ui/Tabs';
import { Skeleton } from './ui/primitives';
import {
  INTEREST_AREAS,
  POPULAR_LANGUAGES,
  toGitHubLanguage,
  type ExperienceLevel,
  type SkillProfile,
} from '@/lib/matching';
import styles from './SkillsForm.module.css';

export const EXPERIENCE_OPTIONS: Array<{ value: ExperienceLevel; label: string; description: string }> = [
  { value: 'beginner', label: 'Beginner', description: 'Good first issues and documentation fixes.' },
  { value: 'intermediate', label: 'Intermediate', description: 'Help-wanted issues and small features.' },
  { value: 'advanced', label: 'Advanced', description: 'Any open issue, including complex ones.' },
];

const POPULAR = new Set(POPULAR_LANGUAGES);
const AREA_VALUES = new Set(INTEREST_AREAS.map(area => area.value));

/** GitHub's spelling of a language when we know it ("golang" → "Go"), otherwise the trimmed entry. */
function canonicalLanguage(entry: string): string {
  const trimmed = entry.trim();
  return toGitHubLanguage(trimmed) ?? trimmed;
}

const languageKey = (entry: string) => canonicalLanguage(entry).toLowerCase();

/** True when two profiles hold the same entries, ignoring order. */
export function sameSkills(a: SkillProfile, b: SkillProfile) {
  const sameSet = (x: string[], y: string[]) => {
    const left = new Set(x);
    const right = new Set(y);
    return left.size === right.size && [...left].every(entry => right.has(entry));
  };
  return (
    a.experienceLevel === b.experienceLevel &&
    sameSet(a.languages, b.languages) &&
    sameSet(a.technologies, b.technologies) &&
    sameSet(a.interests, b.interests)
  );
}

function uniqueBy(values: string[], key: (value: string) => string) {
  const seen = new Set<string>();
  return values.filter(value => {
    const k = key(value);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

interface SkillsFormProps {
  value: SkillProfile;
  onChange: (next: SkillProfile) => void;
  /** Prefix for element ids; defaults to a generated one. */
  idPrefix?: string;
}

/**
 * Editor for a skill profile: languages, frameworks and tools, interest areas
 * and experience level. Controlled; renders no panel or actions of its own.
 */
export default function SkillsForm({ value, onChange, idPrefix }: SkillsFormProps) {
  const generatedId = useId();
  const id = (part: string) => `${idPrefix ?? generatedId}-${part}`;

  const selectedLanguages = new Set(value.languages.map(canonicalLanguage));
  const otherLanguages = value.languages.filter(language => !POPULAR.has(canonicalLanguage(language)));
  const extraInterests = value.interests.filter(interest => !AREA_VALUES.has(interest));
  const level = EXPERIENCE_OPTIONS.find(option => option.value === value.experienceLevel) ?? EXPERIENCE_OPTIONS[0];

  const update = (patch: Partial<SkillProfile>) => onChange({ ...value, ...patch });

  const toggleLanguage = (language: string) =>
    update({
      languages: selectedLanguages.has(language)
        ? value.languages.filter(entry => canonicalLanguage(entry) !== language)
        : [...value.languages, language],
    });

  // Free-text languages. Entries that turn out to be popular ones ("ts") land
  // on their pill instead of becoming a chip; existing order is preserved.
  const setOtherLanguages = (next: string[]) => {
    const nextKeys = new Set(next.map(languageKey));
    const kept = value.languages.filter(
      entry => POPULAR.has(canonicalLanguage(entry)) || nextKeys.has(languageKey(entry))
    );
    update({ languages: uniqueBy([...kept, ...next.map(canonicalLanguage)], languageKey) });
  };

  const toggleInterest = (interest: string) =>
    update({
      interests: value.interests.includes(interest)
        ? value.interests.filter(entry => entry !== interest)
        : [...value.interests, interest],
    });

  return (
    <div className={styles.form}>
      <div
        className={styles.group}
        role="group"
        aria-labelledby={id('languages')}
        aria-describedby={id('languages-hint')}
      >
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span id={id('languages')} className={styles.label}>
              Languages
            </span>
            <Count value={value.languages.length} />
          </div>
          <p id={id('languages-hint')} className={styles.hint}>
            Used to filter GitHub searches by repository language.
          </p>
        </div>
        <div className={styles.body}>
          <Pills label="Popular languages">
            {POPULAR_LANGUAGES.map(language => (
              <Pill key={language} pressed={selectedLanguages.has(language)} onClick={() => toggleLanguage(language)}>
                {language}
              </Pill>
            ))}
          </Pills>
          <Field label="Other languages">
            {fieldId => (
              <ChipInput
                id={fieldId}
                value={otherLanguages}
                onChange={setOtherLanguages}
                transform={canonicalLanguage}
                placeholder="Haskell, Zig, Lua…"
                aria-describedby={id('chip-help')}
              />
            )}
          </Field>
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <label htmlFor={id('tools')} className={styles.label}>
              Frameworks and tools
            </label>
            <Count value={value.technologies.length} />
          </div>
          <p id={id('tools-hint')} className={styles.hint}>
            Matched against repository topics and issue text.
          </p>
        </div>
        <div className={styles.body}>
          <ChipInput
            id={id('tools')}
            value={value.technologies}
            onChange={technologies => update({ technologies })}
            transform={entry => entry.replace(/\s+/g, ' ')}
            placeholder="React, Docker, PostgreSQL…"
            aria-describedby={`${id('tools-hint')} ${id('chip-help')}`}
          />
        </div>
      </div>

      <div className={styles.group} role="group" aria-labelledby={id('areas')} aria-describedby={id('areas-hint')}>
        <div className={styles.head}>
          <div className={styles.labelRow}>
            <span id={id('areas')} className={styles.label}>
              Areas you enjoy
            </span>
            <Count value={value.interests.length} />
          </div>
          <p id={id('areas-hint')} className={styles.hint}>
            Ranks issues that mention these areas higher.
          </p>
        </div>
        <div className={styles.body}>
          <Pills>
            {INTEREST_AREAS.map(area => (
              <Pill key={area.value} pressed={value.interests.includes(area.value)} onClick={() => toggleInterest(area.value)}>
                {area.label}
              </Pill>
            ))}
            {extraInterests.map(interest => (
              <Pill key={interest} pressed onClick={() => toggleInterest(interest)} title="No longer a listed area. Press to remove.">
                {interest}
              </Pill>
            ))}
          </Pills>
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.head}>
          <span className={styles.label}>Experience</span>
          <p className={styles.hint}>Sets which kind of issues are searched for.</p>
        </div>
        <div className={styles.body}>
          <div className={styles.level}>
            <Segmented
              label="Experience"
              options={EXPERIENCE_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
              value={level.value}
              onChange={experienceLevel => update({ experienceLevel })}
            />
            <p className={styles.levelNote} aria-live="polite">
              {level.description}
            </p>
          </div>
        </div>
      </div>

      <p id={id('chip-help')} className="visually-hidden">
        Press Enter or comma to add an entry. Backspace removes the last one.
      </p>
    </div>
  );
}

function Count({ value }: { value: number }) {
  if (value === 0) return null;
  return (
    <span className={styles.count} aria-hidden="true">
      {value}
    </span>
  );
}

/** Placeholder with the same group rhythm, shown while skills load. */
export function SkillsFormSkeleton() {
  const widths = [
    [64, 82, 58, 48, 72, 56, 66, 50, 60, 44],
    [96, 78, 104, 88],
    [112, 104, 64, 120, 72, 96],
  ];
  return (
    <div className={styles.form} aria-hidden="true">
      {widths.map((row, index) => (
        <div key={index} className={styles.group}>
          <div className={styles.head}>
            <Skeleton width={96} height={12} />
            <Skeleton width="80%" height={10} />
          </div>
          <div className={styles.skeletonPills}>
            {row.map((width, pill) => (
              <Skeleton key={pill} width={width} height={28} radius="var(--r-full)" />
            ))}
          </div>
        </div>
      ))}
      <div className={styles.group}>
        <div className={styles.head}>
          <Skeleton width={80} height={12} />
          <Skeleton width="70%" height={10} />
        </div>
        <div className={styles.body}>
          <Skeleton width={264} height={30} radius="var(--r)" />
        </div>
      </div>
    </div>
  );
}
