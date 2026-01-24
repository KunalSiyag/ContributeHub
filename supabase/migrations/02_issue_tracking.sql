-- Tracked Issues table (with issue management)
CREATE TABLE IF NOT EXISTS tracked_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Active users tracking
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('login', 'issue_save', 'pr_submit', 'repo_save')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_recent ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracked_issues_status ON tracked_issues(status);

-- Enable RLS
ALTER TABLE tracked_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracked_issues
CREATE POLICY "Users can view their own tracked issues" ON tracked_issues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked issues" ON tracked_issues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked issues" ON tracked_issues
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked issues" ON tracked_issues
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_activity
CREATE POLICY "Users can view their own activity" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" ON user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read for recent active users (if needed for homepage stats)
CREATE POLICY "Public can view recent activity summary" ON user_activity
  FOR SELECT USING (true);
