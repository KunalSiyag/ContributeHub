-- 06: sign in with Google. The signup trigger fills the GitHub columns only
-- for GitHub sign-ins, so Google accounts never get a Google id stored as
-- github_id, and their photo comes from `picture` when `avatar_url` is absent.
-- Safe to run more than once.

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
