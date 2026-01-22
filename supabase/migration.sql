-- ContributeHub Database Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This adds missing columns to tracked_issues and creates user_activity table

-- Step 1: Add missing columns to tracked_issues table
ALTER TABLE tracked_issues 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS has_bounty BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bounty_amount TEXT,
ADD COLUMN IF NOT EXISTS bounty_source TEXT;

-- Step 2: Update status constraint to match new values
-- First drop the old constraint if it exists
ALTER TABLE tracked_issues DROP CONSTRAINT IF EXISTS tracked_issues_status_check;

-- Add the new status constraint
ALTER TABLE tracked_issues 
ADD CONSTRAINT tracked_issues_status_check 
CHECK (status IN ('saved', 'ongoing', 'pr_submitted', 'completed'));

-- Step 3: Create user_activity table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('login', 'issue_save', 'pr_submit', 'repo_save')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_recent ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracked_issues_status ON tracked_issues(status);
CREATE INDEX IF NOT EXISTS idx_tracked_issues_bounty ON tracked_issues(has_bounty) WHERE has_bounty = true;

-- Step 5: Enable RLS for user_activity
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for user_activity (drop first if they exist)
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity;
DROP POLICY IF EXISTS "Users can insert their own activity" ON user_activity;
DROP POLICY IF EXISTS "Public can view recent activity summary" ON user_activity;

CREATE POLICY "Users can view their own activity" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" ON user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view recent activity summary" ON user_activity
  FOR SELECT USING (created_at > NOW() - INTERVAL '7 days');

-- Step 7: Create function to get active contributors
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

-- Done! Your database is now ready for the issue tracking system.
