-- 05: bring databases created from the older setup files in line with
-- supabase/schema.sql. Idempotent; run in the Supabase SQL editor.

-- Profile columns used by preferences and resume matching
alter table public.profiles add column if not exists technologies text[] not null default '{}';
alter table public.profiles add column if not exists resume_analyzed_at timestamptz;

-- Signup trigger: pinned search_path (the auth schema runs it), fills
-- username, never fails a signup over a duplicate username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, github_username, full_name, avatar_url, github_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'user_name',
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'provider_id'
  )
  on conflict (id) do nothing;
  return new;
exception
  when unique_violation then
    insert into public.profiles (id, github_username, full_name, avatar_url)
    values (
      new.id,
      new.raw_user_meta_data ->> 'user_name',
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
      new.raw_user_meta_data ->> 'avatar_url'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up while the trigger was broken
insert into public.profiles (id, github_username, full_name, avatar_url)
select u.id,
       u.raw_user_meta_data ->> 'user_name',
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
       u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

update public.profiles p
set github_username = u.raw_user_meta_data ->> 'user_name'
from auth.users u
where u.id = p.id and p.github_username is null;

-- Profiles were readable by anyone holding the public anon key, including
-- resume-derived skills. Restrict reads to the owner.
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles
  for select using ((select auth.uid()) = id);

-- saved_repos had no UPDATE policy, so upserts on existing rows failed RLS
drop policy if exists "Users can update their own saved repos" on public.saved_repos;
create policy "Users can update their own saved repos" on public.saved_repos
  for update using ((select auth.uid()) = user_id);

-- Waitlist emails were readable by any signed-in user. Remove every read
-- policy; nothing in the app reads this table anymore.
do $$
begin
  if to_regclass('public.waitlist') is not null then
    execute 'drop policy if exists "Allow generic read for waitlist" on public.waitlist';
    execute 'drop policy if exists "Anyone can view waitlist count" on public.waitlist';
    execute 'revoke select on public.waitlist from anon, authenticated';
  end if;
end $$;

-- Raw activity rows must not be public; aggregates go through the RPC below
drop policy if exists "Public can view recent activity summary" on public.user_activity;

-- Pin search_path on security-definer functions
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

create index if not exists idx_tracked_issues_user_updated on public.tracked_issues (user_id, updated_at desc);
create index if not exists idx_saved_repos_user_created on public.saved_repos (user_id, created_at desc);
