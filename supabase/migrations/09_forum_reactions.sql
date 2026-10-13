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
