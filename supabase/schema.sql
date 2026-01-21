-- ContributeHub Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  github_username TEXT,
  github_id TEXT,
  bio TEXT,
  website TEXT,
  experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_languages TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved repositories table
CREATE TABLE IF NOT EXISTS saved_repos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, repo_full_name)
);

-- Tracked PRs table
CREATE TABLE IF NOT EXISTS tracked_prs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pr_url TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  repo_full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'merged', 'closed')),
  event_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pr_url)
);

-- Tracked Issues table (with issue management)
CREATE TABLE IF NOT EXISTS tracked_issues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  issue_url TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  repo_full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  labels TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'ongoing', 'pr_submitted', 'completed')),
  has_bounty BOOLEAN DEFAULT false,
  bounty_amount TEXT,
  bounty_source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, issue_url)
);

-- Active users tracking (for homepage "Active Contributors")
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('login', 'issue_save', 'pr_submit', 'repo_save')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for recent activity queries
CREATE INDEX IF NOT EXISTS idx_user_activity_recent ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracked_issues_status ON tracked_issues(status);
CREATE INDEX IF NOT EXISTS idx_tracked_issues_bounty ON tracked_issues(has_bounty) WHERE has_bounty = true;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_prs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for saved_repos
CREATE POLICY "Users can view their own saved repos" ON saved_repos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved repos" ON saved_repos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved repos" ON saved_repos
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for tracked_prs
CREATE POLICY "Users can view their own tracked PRs" ON tracked_prs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked PRs" ON tracked_prs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked PRs" ON tracked_prs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked PRs" ON tracked_prs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for tracked_issues
CREATE POLICY "Users can view their own tracked issues" ON tracked_issues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked issues" ON tracked_issues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked issues" ON tracked_issues
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked issues" ON tracked_issues
  FOR DELETE USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url, github_username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracked_prs_updated_at
  BEFORE UPDATE ON tracked_prs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracked_issues_updated_at
  BEFORE UPDATE ON tracked_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for user_activity
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_activity
CREATE POLICY "Users can view their own activity" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" ON user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read for recent active users (for homepage)
CREATE POLICY "Public can view recent activity summary" ON user_activity
  FOR SELECT USING (created_at > NOW() - INTERVAL '7 days');

-- Function to get recent active contributors
CREATE OR REPLACE FUNCTION get_active_contributors(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  action_count BIGINT,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.user_id,
    p.github_username as username,
    p.avatar_url,
    COUNT(ua.id) as action_count,
    MAX(ua.created_at) as last_active
  FROM user_activity ua
  JOIN profiles p ON ua.user_id = p.id
  WHERE ua.created_at > NOW() - INTERVAL '7 days'
  GROUP BY ua.user_id, p.github_username, p.avatar_url
  ORDER BY action_count DESC, last_active DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

