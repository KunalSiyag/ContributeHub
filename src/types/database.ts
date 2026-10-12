// Supabase database types. Mirrors supabase/schema.sql plus the migrations in
// supabase/migrations. Shaped like `supabase gen types` output so the typed
// client (`createBrowserClient<Database>`) infers rows, inserts and updates.

export type DiscussionCategory = 'general' | 'programs' | 'help' | 'showcase';

export type AlertPreset = 'good-first' | 'help-wanted' | 'first-timers' | 'docs' | 'unassigned' | 'all';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type IssueStatus = 'saved' | 'ongoing' | 'pr_submitted' | 'completed';
export type PRStatus = 'open' | 'merged' | 'closed';
export type ActivityType = 'login' | 'issue_save' | 'pr_submit' | 'repo_save';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          github_username: string | null;
          github_id: string | null;
          bio: string | null;
          website: string | null;
          experience_level: ExperienceLevel;
          preferred_languages: string[];
          interests: string[];
          technologies: string[];
          resume_analyzed_at: string | null;
          show_on_leaderboard: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          github_username?: string | null;
          github_id?: string | null;
          bio?: string | null;
          website?: string | null;
          experience_level?: ExperienceLevel;
          preferred_languages?: string[];
          interests?: string[];
          technologies?: string[];
          resume_analyzed_at?: string | null;
          show_on_leaderboard?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      discussions: {
        Row: {
          id: string;
          author_id: string;
          author_name: string;
          author_avatar: string | null;
          author_login: string | null;
          category: DiscussionCategory;
          title: string;
          body: string;
          reply_count: number;
          created_at: string;
          last_activity_at: string;
          /** owner or owner/repo the discussion is about. */
          related: string | null;
          like_count: number;
          dislike_count: number;
        };
        /** Author fields, counters and dates are set by triggers (migration 07). */
        Insert: {
          id?: string;
          category?: DiscussionCategory;
          title: string;
          body: string;
          related?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      discussion_reactions: {
        Row: {
          discussion_id: string;
          user_id: string;
          kind: 'like' | 'dislike';
          created_at: string;
        };
        Insert: {
          discussion_id: string;
          user_id?: string;
          kind: 'like' | 'dislike';
        };
        Update: { kind?: 'like' | 'dislike' };
        Relationships: [];
      };
      discussion_replies: {
        Row: {
          id: string;
          discussion_id: string;
          author_id: string;
          author_name: string;
          author_avatar: string | null;
          author_login: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          discussion_id: string;
          body: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      alert_rules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          preset: AlertPreset;
          language: string | null;
          labels: string[];
          repos: string[];
          keywords: string | null;
          min_stars: number;
          email_digest: boolean;
          last_seen_at: string;
          last_emailed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          preset?: AlertPreset;
          language?: string | null;
          labels?: string[];
          repos?: string[];
          keywords?: string | null;
          min_stars?: number;
          email_digest?: boolean;
          last_seen_at?: string;
          last_emailed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['alert_rules']['Insert']>;
        Relationships: [];
      };
      saved_repos: {
        Row: {
          id: string;
          user_id: string;
          repo_full_name: string;
          repo_data: Json;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          repo_full_name: string;
          repo_data: Json;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['saved_repos']['Insert']>;
        Relationships: [];
      };
      tracked_prs: {
        Row: {
          id: string;
          user_id: string;
          pr_url: string;
          pr_number: number;
          repo_full_name: string;
          title: string;
          status: PRStatus;
          event_label: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pr_url: string;
          pr_number: number;
          repo_full_name: string;
          title: string;
          status?: PRStatus;
          event_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tracked_prs']['Insert']>;
        Relationships: [];
      };
      tracked_issues: {
        Row: {
          id: string;
          user_id: string;
          issue_url: string;
          issue_number: number;
          repo_full_name: string;
          title: string;
          description: string | null;
          labels: string[];
          status: IssueStatus;
          has_bounty: boolean;
          bounty_amount: string | null;
          bounty_source: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          issue_url: string;
          issue_number: number;
          repo_full_name: string;
          title: string;
          description?: string | null;
          labels?: string[];
          status?: IssueStatus;
          has_bounty?: boolean;
          bounty_amount?: string | null;
          bounty_source?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tracked_issues']['Insert']>;
        Relationships: [];
      };
      user_activity: {
        Row: {
          id: string;
          user_id: string;
          action_type: ActivityType;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: ActivityType;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_activity']['Insert']>;
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['waitlist']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      leaderboard_members: {
        Args: Record<string, never>;
        Returns: Array<{ github_username: string; display_name: string; avatar_url: string | null }>;
      };
      get_active_contributors: {
        Args: { limit_count?: number };
        Returns: {
          user_id: string;
          username: string | null;
          avatar_url: string | null;
          action_count: number;
          last_active: string;
        }[];
      };
      sum_bounties: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type Tables = Database['public']['Tables'];

export type Profile = Tables['profiles']['Row'];
export type SavedRepo = Tables['saved_repos']['Row'];
export type TrackedPR = Tables['tracked_prs']['Row'];
export type TrackedIssue = Tables['tracked_issues']['Row'];
export type UserActivity = Tables['user_activity']['Row'];
