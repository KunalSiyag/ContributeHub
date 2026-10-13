-- Orion database schema (fresh install).
-- Run once in the Supabase SQL editor. Idempotent: safe to re-run.
-- Existing databases created from the older files should run
-- migrations/05_orion_workspace.sql instead.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  github_username text,
  github_id text,
  bio text,
  website text,
  experience_level text not null default 'beginner'
    check (experience_level in ('beginner', 'intermediate', 'advanced')),
  preferred_languages text[] not null default '{}',
  interests text[] not null default '{}',
  technologies text[] not null default '{}',
  resume_analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Workspace tables
-- ---------------------------------------------------------------------------
create table if not exists public.saved_repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  repo_full_name text not null,
  repo_data jsonb not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, repo_full_name)
);

create table if not exists public.tracked_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  issue_url text not null,
  issue_number integer not null,
  repo_full_name text not null,
  title text not null,
  description text,
  labels text[] not null default '{}',
  status text not null default 'saved'
    check (status in ('saved', 'ongoing', 'pr_submitted', 'completed')),
  has_bounty boolean not null default false,
  bounty_amount text,
  bounty_source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, issue_url)
);

create table if not exists public.tracked_prs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pr_url text not null,
  pr_number integer not null,
  repo_full_name text not null,
  title text not null,
  status text not null default 'open' check (status in ('open', 'merged', 'closed')),
  event_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pr_url)
);

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action_type text not null check (action_type in ('login', 'issue_save', 'pr_submit', 'repo_save')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes matching the app's access patterns
-- ---------------------------------------------------------------------------
create index if not exists idx_tracked_issues_user_updated on public.tracked_issues (user_id, updated_at desc);
create index if not exists idx_tracked_issues_repo on public.tracked_issues (repo_full_name);
create index if not exists idx_saved_repos_user_created on public.saved_repos (user_id, created_at desc);
create index if not exists idx_tracked_prs_user_created on public.tracked_prs (user_id, created_at desc);
create index if not exists idx_user_activity_user_created on public.user_activity (user_id, created_at desc);
create index if not exists idx_user_activity_recent on public.user_activity (created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_tracked_issues_updated_at on public.tracked_issues;
create trigger update_tracked_issues_updated_at before update on public.tracked_issues
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_tracked_prs_updated_at on public.tracked_prs;
create trigger update_tracked_prs_updated_at before update on public.tracked_prs
  for each row execute function public.update_updated_at_column();

-- New GitHub sign-ups get a profile row. search_path is pinned because the
-- auth trigger runs outside the public schema.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  login text;
  display_name text;
  avatar text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  -- Only GitHub sign-ins carry a GitHub login; Google and other providers leave it empty.
  login := case when new.raw_app_meta_data ->> 'provider' = 'github' then meta ->> 'user_name' end;
  display_name := coalesce(meta ->> 'full_name', meta ->> 'name');
  avatar := coalesce(meta ->> 'avatar_url', meta ->> 'picture');

  insert into public.profiles (id, username, github_username, full_name, avatar_url, github_id)
  values (new.id, login, login, display_name, avatar, case when login is not null then meta ->> 'provider_id' end)
  on conflict (id) do nothing;
  return new;
exception
  when unique_violation then
    -- username taken by another account: create the profile without it
    insert into public.profiles (id, github_username, full_name, avatar_url, github_id)
    values (new.id, login, display_name, avatar, case when login is not null then meta ->> 'provider_id' end)
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.saved_repos enable row level security;
alter table public.tracked_issues enable row level security;
alter table public.tracked_prs enable row level security;
alter table public.user_activity enable row level security;

-- Profiles hold resume-derived skills: each user reads only their own row.
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles for select using ((select auth.uid()) = id);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check ((select auth.uid()) = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using ((select auth.uid()) = id);

drop policy if exists "Users can view their own saved repos" on public.saved_repos;
create policy "Users can view their own saved repos" on public.saved_repos for select using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert their own saved repos" on public.saved_repos;
create policy "Users can insert their own saved repos" on public.saved_repos for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own saved repos" on public.saved_repos;
create policy "Users can update their own saved repos" on public.saved_repos for update using ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own saved repos" on public.saved_repos;
create policy "Users can delete their own saved repos" on public.saved_repos for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own tracked issues" on public.tracked_issues;
create policy "Users can view their own tracked issues" on public.tracked_issues for select using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert their own tracked issues" on public.tracked_issues;
create policy "Users can insert their own tracked issues" on public.tracked_issues for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own tracked issues" on public.tracked_issues;
create policy "Users can update their own tracked issues" on public.tracked_issues for update using ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own tracked issues" on public.tracked_issues;
create policy "Users can delete their own tracked issues" on public.tracked_issues for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own tracked PRs" on public.tracked_prs;
create policy "Users can view their own tracked PRs" on public.tracked_prs for select using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert their own tracked PRs" on public.tracked_prs;
create policy "Users can insert their own tracked PRs" on public.tracked_prs for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own tracked PRs" on public.tracked_prs;
create policy "Users can update their own tracked PRs" on public.tracked_prs for update using ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own tracked PRs" on public.tracked_prs;
create policy "Users can delete their own tracked PRs" on public.tracked_prs for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own activity" on public.user_activity;
create policy "Users can view their own activity" on public.user_activity for select using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert their own activity" on public.user_activity;
create policy "Users can insert their own activity" on public.user_activity for insert with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Aggregates (security definer, no per-user data exposed)
-- ---------------------------------------------------------------------------
create or replace function public.get_active_contributors(limit_count integer default 10)
returns table (user_id uuid, username text, avatar_url text, action_count bigint, last_active timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select ua.user_id, p.github_username, p.avatar_url, count(ua.id), max(ua.created_at)
  from public.user_activity ua
  join public.profiles p on p.id = ua.user_id
  where ua.created_at > now() - interval '7 days'
  group by ua.user_id, p.github_username, p.avatar_url
  order by count(ua.id) desc, max(ua.created_at) desc
  limit least(limit_count, 50);
$$;

create or replace function public.sum_bounties()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(nullif(regexp_replace(bounty_amount, '[^0-9.]', '', 'g'), '')::numeric), 0)
  from public.tracked_issues
  where has_bounty = true;
$$;

grant execute on function public.get_active_contributors(integer) to anon, authenticated;
grant execute on function public.sum_bounties() to anon, authenticated;

-- ===== Community discussions (migration 07) =====

create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default 'Member',
  author_avatar text,
  author_login text,
  category text not null default 'general'
    check (category in ('general', 'programs', 'help', 'showcase')),
  title text not null check (char_length(btrim(title)) between 8 and 140),
  body text not null check (char_length(btrim(body)) between 1 and 8000),
  reply_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table if not exists public.discussion_replies (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default 'Member',
  author_avatar text,
  author_login text,
  body text not null check (char_length(btrim(body)) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index if not exists discussions_activity_idx on public.discussions (last_activity_at desc);
create index if not exists discussions_category_idx on public.discussions (category, last_activity_at desc);
create index if not exists discussions_author_idx on public.discussions (author_id);
create index if not exists discussion_replies_thread_idx on public.discussion_replies (discussion_id, created_at);
create index if not exists discussion_replies_author_idx on public.discussion_replies (author_id);

-- Who is posting, from their own profile; also enforces the hourly cap.
create or replace function public.stamp_community_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  recent integer;
begin
  if me is null then
    raise exception 'Sign in to post.' using errcode = '42501';
  end if;

  select count(*) into recent
  from (
    select created_at from public.discussions where author_id = me and created_at > now() - interval '1 hour'
    union all
    select created_at from public.discussion_replies where author_id = me and created_at > now() - interval '1 hour'
  ) posts;
  if recent >= 20 then
    raise exception 'Too many posts in the last hour. Try again later.' using errcode = '54000';
  end if;

  new.author_id := me;
  select coalesce(nullif(btrim(p.full_name), ''), nullif(p.github_username, ''), nullif(p.username, ''), 'Member'),
         p.avatar_url,
         nullif(p.github_username, '')
    into new.author_name, new.author_avatar, new.author_login
  from public.profiles p
  where p.id = me;
  new.author_name := coalesce(new.author_name, 'Member');
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists stamp_discussion_author on public.discussions;
create trigger stamp_discussion_author
  before insert on public.discussions
  for each row execute function public.stamp_community_author();

drop trigger if exists stamp_reply_author on public.discussion_replies;
create trigger stamp_reply_author
  before insert on public.discussion_replies
  for each row execute function public.stamp_community_author();

-- Keep each thread's reply count and last activity current.
create or replace function public.touch_discussion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.discussions
       set reply_count = reply_count + 1, last_activity_at = now()
     where id = new.discussion_id;
    return new;
  end if;
  update public.discussions
     set reply_count = greatest(reply_count - 1, 0)
   where id = old.discussion_id;
  return old;
end;
$$;

drop trigger if exists touch_discussion_on_reply on public.discussion_replies;
create trigger touch_discussion_on_reply
  after insert or delete on public.discussion_replies
  for each row execute function public.touch_discussion();

-- Only what the forum needs (granted below): anyone reads; signed-in members
-- post and delete, which the policies narrow to their own rows. Counters
-- belong to the triggers, so nobody updates rows directly. This also drops
-- the table privileges Supabase grants by default (truncate, references…).
revoke all on public.discussions, public.discussion_replies from anon, authenticated;

alter table public.discussions enable row level security;
alter table public.discussion_replies enable row level security;

drop policy if exists "Anyone can read discussions" on public.discussions;
create policy "Anyone can read discussions" on public.discussions for select using (true);
drop policy if exists "Members start discussions as themselves" on public.discussions;
create policy "Members start discussions as themselves" on public.discussions for insert to authenticated
  with check ((select auth.uid()) = author_id);
drop policy if exists "Members delete their own discussions" on public.discussions;
create policy "Members delete their own discussions" on public.discussions for delete to authenticated
  using ((select auth.uid()) = author_id);

drop policy if exists "Anyone can read replies" on public.discussion_replies;
create policy "Anyone can read replies" on public.discussion_replies for select using (true);
drop policy if exists "Members reply as themselves" on public.discussion_replies;
create policy "Members reply as themselves" on public.discussion_replies for insert to authenticated
  with check ((select auth.uid()) = author_id);
drop policy if exists "Members delete their own replies" on public.discussion_replies;
create policy "Members delete their own replies" on public.discussion_replies for delete to authenticated
  using ((select auth.uid()) = author_id);

grant select on public.discussions, public.discussion_replies to anon, authenticated;
grant insert, delete on public.discussions, public.discussion_replies to authenticated;

-- Opt-in leaderboard. Profiles stay private (migration 05); this function
-- exposes only what the leaderboard shows, and only for members who opted in.
alter table public.profiles add column if not exists show_on_leaderboard boolean not null default false;

create or replace function public.leaderboard_members()
returns table (github_username text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.github_username,
         coalesce(nullif(btrim(p.full_name), ''), p.github_username),
         p.avatar_url
  from public.profiles p
  where p.show_on_leaderboard and nullif(p.github_username, '') is not null
  order by p.github_username
  limit 200;
$$;

revoke all on function public.leaderboard_members() from public;
grant execute on function public.leaderboard_members() to anon, authenticated;

-- ===== Issue alerts (migration 08) =====

-- 08: issue alerts. Members save searches ("alerts"); Orion counts the issues
-- opened since they last looked, can notify them in the browser, offers each
-- alert as an RSS feed, and emails a daily digest for the alerts where they
-- turned email on (only when the site has email set up). Members see and
-- change only their own alerts. Safe to run more than once.

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  preset text not null default 'good-first'
    check (preset in ('good-first', 'help-wanted', 'first-timers', 'docs', 'unassigned', 'all')),
  language text check (language is null or char_length(language) between 1 and 40),
  labels text[] not null default '{}' check (cardinality(labels) <= 5),
  repos text[] not null default '{}' check (cardinality(repos) <= 12),
  keywords text check (keywords is null or char_length(keywords) between 1 and 120),
  min_stars integer not null default 0 check (min_stars between 0 and 1000000),
  email_digest boolean not null default false,
  last_seen_at timestamptz not null default now(),
  last_emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists alert_rules_user_idx on public.alert_rules (user_id, created_at);
create index if not exists alert_rules_email_idx on public.alert_rules (last_emailed_at nulls first) where email_digest;

-- Ten alerts per member keeps the GitHub searches behind them affordable.
create or replace function public.limit_alert_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.alert_rules where user_id = new.user_id) >= 10 then
    raise exception 'You can keep up to 10 alerts.' using errcode = '54000';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_alert_rules on public.alert_rules;
create trigger limit_alert_rules
  before insert on public.alert_rules
  for each row execute function public.limit_alert_rules();

alter table public.alert_rules enable row level security;

-- Signed-in members only; nothing for anonymous visitors.
revoke all on public.alert_rules from anon, authenticated;
grant select, insert, update, delete on public.alert_rules to authenticated;

drop policy if exists "Members read their own alerts" on public.alert_rules;
create policy "Members read their own alerts" on public.alert_rules for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Members create their own alerts" on public.alert_rules;
create policy "Members create their own alerts" on public.alert_rules for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Members change their own alerts" on public.alert_rules;
create policy "Members change their own alerts" on public.alert_rules for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Members delete their own alerts" on public.alert_rules;
create policy "Members delete their own alerts" on public.alert_rules for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===== Forum reactions and links (migration 09) =====

-- 09: forum reactions and links. Members like or dislike a discussion (one
-- reaction each, which they can change or take back), and a discussion can
-- name the repository or organization it is about. A trigger keeps the
-- counts; members see only their own reactions. Safe to run more than once.

alter table public.discussions add column if not exists related text
  check (related is null or related ~ '^[A-Za-z0-9-]{1,39}(/[A-Za-z0-9._-]{1,100})?$');
alter table public.discussions add column if not exists like_count integer not null default 0;
alter table public.discussions add column if not exists dislike_count integer not null default 0;

create table if not exists public.discussion_reactions (
  discussion_id uuid not null references public.discussions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (discussion_id, user_id)
);

create index if not exists discussion_reactions_user_idx on public.discussion_reactions (user_id);

-- Counts belong to the trigger (members can't update discussions directly, see 07).
create or replace function public.count_discussion_reactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.discussions
       set like_count = greatest(like_count - (old.kind = 'like')::int, 0),
           dislike_count = greatest(dislike_count - (old.kind = 'dislike')::int, 0)
     where id = old.discussion_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.discussions
       set like_count = like_count + (new.kind = 'like')::int,
           dislike_count = dislike_count + (new.kind = 'dislike')::int
     where id = new.discussion_id;
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists count_discussion_reactions on public.discussion_reactions;
create trigger count_discussion_reactions
  after insert or update of kind or delete on public.discussion_reactions
  for each row execute function public.count_discussion_reactions();

alter table public.discussion_reactions enable row level security;

revoke all on public.discussion_reactions from anon, authenticated;
grant select, insert, update, delete on public.discussion_reactions to authenticated;

drop policy if exists "Members see their own reactions" on public.discussion_reactions;
create policy "Members see their own reactions" on public.discussion_reactions for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Members react as themselves" on public.discussion_reactions;
create policy "Members react as themselves" on public.discussion_reactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Members change their own reaction" on public.discussion_reactions;
create policy "Members change their own reaction" on public.discussion_reactions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Members take back their own reaction" on public.discussion_reactions;
create policy "Members take back their own reaction" on public.discussion_reactions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===== Member cards (migration 10) =====

-- 10: member cards. Members who appear on the leaderboard can pick a banner
-- for their public profile, and a verified tick shows when their GitHub
-- username comes from signing in with that GitHub account (a name typed in
-- Preferences doesn't count). Only opted-in members are exposed, and only
-- these fields. Safe to run more than once.

alter table public.profiles add column if not exists profile_banner text
  check (profile_banner is null or profile_banner in ('graphite', 'spectrum', 'merged', 'night'));

-- True when the member signed in with the GitHub account their username names.
create or replace function public.github_verified(member uuid, login text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.identities i
    where i.user_id = member
      and i.provider = 'github'
      and lower(i.identity_data ->> 'user_name') = lower(login)
  );
$$;
revoke all on function public.github_verified(uuid, text) from public, anon, authenticated;

-- The leaderboard now says who is verified (replaces 07's version).
drop function if exists public.leaderboard_members();
create function public.leaderboard_members()
returns table (github_username text, display_name text, avatar_url text, verified boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.github_username,
         coalesce(nullif(btrim(p.full_name), ''), p.github_username),
         p.avatar_url,
         public.github_verified(p.id, p.github_username)
  from public.profiles p
  where p.show_on_leaderboard and nullif(p.github_username, '') is not null
  order by p.github_username
  limit 200;
$$;
revoke all on function public.leaderboard_members() from public;
grant execute on function public.leaderboard_members() to anon, authenticated;

-- One opted-in member's public card, for their profile page.
create or replace function public.member_card(login text)
returns table (github_username text, display_name text, avatar_url text, profile_banner text, verified boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.github_username,
         coalesce(nullif(btrim(p.full_name), ''), p.github_username),
         p.avatar_url,
         p.profile_banner,
         public.github_verified(p.id, p.github_username)
  from public.profiles p
  where p.show_on_leaderboard and lower(p.github_username) = lower(login)
  limit 1;
$$;
revoke all on function public.member_card(text) from public;
grant execute on function public.member_card(text) to anon, authenticated;
