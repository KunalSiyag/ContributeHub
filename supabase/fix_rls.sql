-- Fix RLS Policies for tracked_issues and user_activity
-- Run this in your Supabase SQL Editor

-- First, let's check if RLS is enabled and policies exist
-- If policies are too restrictive, the 406 error occurs

-- Drop existing policies (if any) and recreate them correctly
DROP POLICY IF EXISTS "Users can view their own tracked issues" ON tracked_issues;
DROP POLICY IF EXISTS "Users can insert their own tracked issues" ON tracked_issues;
DROP POLICY IF EXISTS "Users can update their own tracked issues" ON tracked_issues;
DROP POLICY IF EXISTS "Users can delete their own tracked issues" ON tracked_issues;

-- Create correct RLS policies for tracked_issues
CREATE POLICY "Users can view their own tracked issues" ON tracked_issues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked issues" ON tracked_issues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked issues" ON tracked_issues
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked issues" ON tracked_issues
  FOR DELETE USING (auth.uid() = user_id);

-- Fix user_activity policies
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity;
DROP POLICY IF EXISTS "Users can insert their own activity" ON user_activity;
DROP POLICY IF EXISTS "Public can view recent activity summary" ON user_activity;

CREATE POLICY "Users can view their own activity" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" ON user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also ensure the user has a profile (required due to foreign key)
-- Check if your profile exists:
-- SELECT * FROM profiles WHERE id = auth.uid();

-- If no profile exists, the trigger might have failed. Create it manually:
-- INSERT INTO profiles (id, github_username, avatar_url)
-- VALUES (auth.uid(), 'YOUR_GITHUB_USERNAME', 'YOUR_AVATAR_URL')
-- ON CONFLICT (id) DO NOTHING;

-- Done! Try saving an issue again.
