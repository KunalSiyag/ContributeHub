'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EMPTY_SKILLS, hasSkills, type ExperienceLevel, type SkillProfile } from '@/lib/matching';

const STORAGE_KEY = 'orion_skills';
const LEGACY_KEY = 'contributehub_preferences';
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: SkillProfile = EMPTY_SKILLS;

function normalize(value: Partial<SkillProfile> | null | undefined): SkillProfile {
  const list = (input: unknown) =>
    Array.isArray(input) ? Array.from(new Set(input.filter((v): v is string => typeof v === 'string' && v.trim() !== ''))) : [];
  const level = value?.experienceLevel;
  return {
    languages: list(value?.languages),
    technologies: list(value?.technologies),
    interests: list(value?.interests),
    experienceLevel: level === 'intermediate' || level === 'advanced' ? level : 'beginner',
  };
}

function readLocal(): SkillProfile {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // One-time migration from the pre-redesign preferences format.
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const old = JSON.parse(legacy) as { skills?: string[]; preferredLanguages?: string[]; interests?: string[]; experienceLevel?: ExperienceLevel };
        raw = JSON.stringify(
          normalize({
            languages: [...(old.preferredLanguages ?? []), ...(old.skills ?? [])],
            interests: old.interests,
            experienceLevel: old.experienceLevel,
          })
        );
        localStorage.setItem(STORAGE_KEY, raw);
      }
    }
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? normalize(JSON.parse(raw)) : EMPTY_SKILLS;
  } catch {
    cachedValue = EMPTY_SKILLS;
  }
  return cachedValue;
}

function writeLocal(skills: SkillProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  } catch {
    // ignore: private mode
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export interface UseSkills {
  skills: SkillProfile;
  /** False until we know whether the user has skills (profile still loading). */
  ready: boolean;
  hasSkills: boolean;
  source: 'profile' | 'device';
  save: (next: SkillProfile) => Promise<{ error: string | null }>;
}

/**
 * The user's skills: from their profile when signed in, otherwise from this
 * device. Saving while signed in writes both.
 */
export function useSkills(): UseSkills {
  const { user, profile, profileReady, updateProfile } = useAuth();
  const local = useSyncExternalStore(subscribe, readLocal, () => EMPTY_SKILLS);

  const skills = useMemo<SkillProfile>(() => {
    if (user && profile) {
      return normalize({
        languages: profile.preferred_languages,
        technologies: profile.technologies,
        interests: profile.interests,
        experienceLevel: profile.experience_level,
      });
    }
    return local;
  }, [user, profile, local]);

  const save = useCallback(
    async (next: SkillProfile) => {
      const clean = normalize(next);
      writeLocal(clean);
      if (!user) return { error: null };
      return updateProfile({
        preferred_languages: clean.languages,
        technologies: clean.technologies,
        interests: clean.interests,
        experience_level: clean.experienceLevel,
      });
    },
    [user, updateProfile]
  );

  return {
    skills,
    ready: profileReady,
    hasSkills: hasSkills(skills),
    source: user ? 'profile' : 'device',
    save,
  };
}
