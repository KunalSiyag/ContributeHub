-- 07: community discussions and the opt-in leaderboard. Anyone can read
-- discussions; signed-in members post and reply as themselves. Author names
-- and avatars are copied from the poster's profile by a trigger, so nobody
-- can post as someone else, and a member can delete only their own posts. A
-- per-member hourly cap keeps spam down. Members appear on the leaderboard
-- only after switching it on themselves. Safe to run more than once.

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
