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
