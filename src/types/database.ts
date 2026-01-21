// Database types for Supabase
// These match the schema that will be created in Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // User profiles (extends Supabase auth.users)
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
          experience_level: 'beginner' | 'intermediate' | 'advanced';
          preferred_languages: string[];
          interests: string[];
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
          experience_level?: 'beginner' | 'intermediate' | 'advanced';
          preferred_languages?: string[];
          interests?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          github_username?: string | null;
          github_id?: string | null;
          bio?: string | null;
          website?: string | null;
          experience_level?: 'beginner' | 'intermediate' | 'advanced';
          preferred_languages?: string[];
          interests?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      
      // Saved/bookmarked repositories
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
        Update: {
          id?: string;
          user_id?: string;
          repo_full_name?: string;
          repo_data?: Json;
          notes?: string | null;
          created_at?: string;
        };
      };
      
      // Tracked PRs
      tracked_prs: {
        Row: {
          id: string;
          user_id: string;
          pr_url: string;
          pr_number: number;
          repo_full_name: string;
          title: string;
          status: 'open' | 'merged' | 'closed';
          event_label: string | null; // e.g., 'hacktoberfest', 'gsoc'
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
          status?: 'open' | 'merged' | 'closed';
          event_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pr_url?: string;
          pr_number?: number;
          repo_full_name?: string;
          title?: string;
          status?: 'open' | 'merged' | 'closed';
          event_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      // Tracked Issues
      tracked_issues: {
        Row: {
          id: string;
          user_id: string;
          issue_url: string;
          issue_number: number;
          repo_full_name: string;
          title: string;
          status: 'open' | 'in_progress' | 'closed';
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
          status?: 'open' | 'in_progress' | 'closed';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          issue_url?: string;
          issue_number?: number;
          repo_full_name?: string;
          title?: string;
          status?: 'open' | 'in_progress' | 'closed';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type SavedRepo = Database['public']['Tables']['saved_repos']['Row'];
export type TrackedPR = Database['public']['Tables']['tracked_prs']['Row'];
export type TrackedIssue = Database['public']['Tables']['tracked_issues']['Row'];
