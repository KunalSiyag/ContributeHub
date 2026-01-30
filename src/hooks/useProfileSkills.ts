import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback, useEffect } from 'react';

export interface ProfileSkills {
  preferred_languages: string[];
  technologies: string[];
  interests: string[];
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  resume_analyzed_at: string | null;
}

const DEFAULT_SKILLS: ProfileSkills = {
  preferred_languages: [],
  technologies: [],
  interests: [],
  experience_level: 'beginner',
  resume_analyzed_at: null,
};

export function useProfileSkills() {
  const { user } = useAuth();
  const supabase = createClient();
  const [skills, setSkills] = useState<ProfileSkills>(DEFAULT_SKILLS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch skills from profile
  const fetchSkills = useCallback(async () => {
    if (!user) {
      setSkills(DEFAULT_SKILLS);
      setHasLoaded(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await (supabase
        .from('profiles') as any)
        .select('preferred_languages, technologies, interests, experience_level, resume_analyzed_at')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        // Profile might not exist yet, use defaults
        console.warn('Could not fetch profile skills:', fetchError.message);
        setSkills(DEFAULT_SKILLS);
      } else if (data) {
        setSkills({
          preferred_languages: data.preferred_languages || [],
          technologies: data.technologies || [],
          interests: data.interests || [],
          experience_level: data.experience_level || 'beginner',
          resume_analyzed_at: data.resume_analyzed_at,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch skills');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [user, supabase]);

  // Save skills to profile
  const saveSkills = useCallback(async (newSkills: Partial<ProfileSkills>) => {
    if (!user) {
      setError('Must be logged in to save skills');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: Record<string, any> = {};
      
      if (newSkills.preferred_languages !== undefined) {
        updateData.preferred_languages = newSkills.preferred_languages;
      }
      if (newSkills.technologies !== undefined) {
        updateData.technologies = newSkills.technologies;
      }
      if (newSkills.interests !== undefined) {
        updateData.interests = newSkills.interests;
      }
      if (newSkills.experience_level !== undefined) {
        updateData.experience_level = newSkills.experience_level;
      }
      if (newSkills.resume_analyzed_at !== undefined) {
        updateData.resume_analyzed_at = newSkills.resume_analyzed_at;
      }

      const { error: updateError } = await (supabase
        .from('profiles') as any)
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setSkills(prev => ({ ...prev, ...newSkills }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save skills');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Save resume analysis results to profile
  const saveResumeAnalysis = useCallback(async (analysis: {
    skills: string[];
    technologies: string[];
    interests: string[];
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  }) => {
    return saveSkills({
      preferred_languages: analysis.skills,
      technologies: analysis.technologies,
      interests: analysis.interests,
      experience_level: analysis.experienceLevel,
      resume_analyzed_at: new Date().toISOString(),
    });
  }, [saveSkills]);

  // Check if user has skills configured
  const hasSkills = skills.preferred_languages.length > 0 || 
                    skills.technologies.length > 0 || 
                    skills.interests.length > 0;

  // Load skills on mount
  useEffect(() => {
    if (user && !hasLoaded) {
      fetchSkills();
    }
  }, [user, hasLoaded, fetchSkills]);

  return {
    skills,
    loading,
    error,
    hasSkills,
    hasLoaded,
    fetchSkills,
    saveSkills,
    saveResumeAnalysis,
    isLoggedIn: !!user,
  };
}
