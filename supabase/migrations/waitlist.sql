-- Create the waitlist table
create table public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.waitlist enable row level security;

-- Create policy to allow anonymous inserts (anyone can join waitlist)
create policy "Allow generic insert for waitlist"
on public.waitlist
for insert
to anon, authenticated
with check (true);

-- Create policy to allow reading counts (for stats)
create policy "Allow generic read for waitlist"
on public.waitlist
for select
to anon, authenticated
using (true);
