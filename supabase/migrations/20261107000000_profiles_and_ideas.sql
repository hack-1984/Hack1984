-- Idea Tree storage. Two tables, one policy each.
--
-- The Idea is stored as a document (doc jsonb) because the API routes are
-- stateless and already treat it as one: the client sends the whole Idea and
-- gets an Idea or TreeUpdate[] back. Scalar columns exist only so the ideas
-- list can render without parsing the blob. Routes never touch these tables;
-- the browser reads and writes through the Supabase client under RLS.

-- One row per account: the team card.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  team       jsonb not null default '{}'::jsonb,   -- TeamProfile
  updated_at timestamptz not null default now()
);

-- One row per idea: the document lives in doc.
create table if not exists public.ideas (
  id            text primary key,                   -- same nanoid as Idea.id
  owner_id      uuid not null references auth.users(id) on delete cascade,
  title         text not null,                      -- the probe's two fields, for the list
  description   text not null default '',
  mode          text not null default 'startup' check (mode in ('startup', 'nonprofit')),
  pillar_scores jsonb not null default '[]'::jsonb, -- 8 numbers 0-1, for the list's bars
  doc           jsonb not null,                     -- the whole Idea
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists ideas_owner_recent on public.ideas (owner_id, updated_at desc);

-- updated_at maintained by the database, not the client.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ideas_touch on public.ideas;
create trigger ideas_touch before update on public.ideas
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- You only ever see your own rows.
alter table public.ideas enable row level security;
drop policy if exists own_ideas on public.ideas;
create policy own_ideas on public.ideas
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.profiles enable row level security;
drop policy if exists own_profile on public.profiles;
create policy own_profile on public.profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
