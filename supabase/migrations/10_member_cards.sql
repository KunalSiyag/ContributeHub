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
