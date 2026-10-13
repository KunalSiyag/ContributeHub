-- Performance & security hardening migration
-- Run in Supabase SQL editor. Idempotent: safe to run multiple times.

-- 1. Composite indexes matching real access patterns

-- Dashboard lists sort by recency per user
CREATE INDEX IF NOT EXISTS idx_tracked_issues_user_updated
  ON tracked_issues (user_id, updated_at DESC);

-- Activity feeds filter by user + time
CREATE INDEX IF NOT EXISTS idx_user_activity_user_created
  ON user_activity (user_id, created_at DESC);

-- Saved repos / PRs dashboards are always user-scoped
CREATE INDEX IF NOT EXISTS idx_saved_repos_user_created
  ON saved_repos (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracked_prs_user_created
  ON tracked_prs (user_id, created_at DESC);

-- Fast lookup of tracked issues by repo (dashboard grouping)
CREATE INDEX IF NOT EXISTS idx_tracked_issues_repo
  ON tracked_issues (repo_full_name);

-- 2. Server-side bounty sum used by /api/stats (replaces unbounded row scans)
CREATE OR REPLACE FUNCTION public.sum_bounties()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    NULLIF(REGEXP_REPLACE(bounty_amount, '[^0-9.]', '', 'g'), '')::numeric
  ), 0)
  FROM tracked_issues
  WHERE has_bounty = true;
$$;

GRANT EXECUTE ON FUNCTION public.sum_bounties() TO anon, authenticated;

-- 3. Close data leaks

-- Waitlist emails must not be publicly readable.
DROP POLICY IF EXISTS "Anyone can view waitlist count" ON waitlist;
REVOKE SELECT ON waitlist FROM anon;

-- Raw activity rows expose user ids and metadata; only the
-- security-definer RPC get_active_contributors() should serve aggregates.
DROP POLICY IF EXISTS "Public can view recent activity summary" ON user_activity;
