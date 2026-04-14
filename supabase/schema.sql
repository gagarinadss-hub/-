-- ================================================
-- Рандом Кофе — Supabase Schema
-- Выполни этот SQL в Supabase SQL Editor
-- ================================================

-- Profiles
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  name        text not null,
  avatar_url  text,
  role        text not null default '',
  company     text,
  bio         text not null default '',
  goals       text not null default '',
  expertise   text not null default '',
  telegram    text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Matches
create table if not exists public.matches (
  id             uuid primary key default gen_random_uuid(),
  participant_a  uuid references public.profiles(id) on delete cascade not null,
  participant_b  uuid references public.profiles(id) on delete cascade not null,
  matched_at     timestamptz not null default now(),
  status         text not null default 'pending' check (status in ('pending', 'completed', 'skipped'))
);

-- Meetings
create table if not exists public.meetings (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid references public.matches(id) on delete cascade not null,
  initiator_id  uuid references public.profiles(id) on delete cascade not null,
  notes         text,
  met_at        timestamptz not null default now()
);

-- Announcements
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  author_id   uuid references public.profiles(id) on delete set null,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Events
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  event_date   timestamptz not null,
  location     text,
  link         text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ================================================
-- Row Level Security
-- ================================================

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.meetings enable row level security;
alter table public.announcements enable row level security;
alter table public.events enable row level security;

-- Profiles
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
create policy "profiles_admin_update" on public.profiles for update using (
  exists(select 1 from public.profiles where user_id = auth.uid() and is_admin = true)
);
create policy "profiles_delete" on public.profiles for delete using (auth.uid() = user_id);

-- Matches
create policy "matches_select" on public.matches for select using (auth.uid() is not null);
create policy "matches_insert" on public.matches for insert with check (
  auth.uid() = (select user_id from public.profiles where id = participant_a)
);
create policy "matches_update" on public.matches for update using (
  auth.uid() = (select user_id from public.profiles where id = participant_a) or
  auth.uid() = (select user_id from public.profiles where id = participant_b)
);

-- Meetings
create policy "meetings_select" on public.meetings for select using (auth.uid() is not null);
create policy "meetings_insert" on public.meetings for insert with check (
  auth.uid() = (select user_id from public.profiles where id = initiator_id)
);

-- Announcements
create policy "announcements_select" on public.announcements for select using (true);
create policy "announcements_admin" on public.announcements for all using (
  exists(select 1 from public.profiles where user_id = auth.uid() and is_admin = true)
);

-- Events
create policy "events_select" on public.events for select using (true);
create policy "events_admin" on public.events for all using (
  exists(select 1 from public.profiles where user_id = auth.uid() and is_admin = true)
);

-- ================================================
-- Indexes
-- ================================================

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists matches_participant_a_idx on public.matches(participant_a);
create index if not exists matches_participant_b_idx on public.matches(participant_b);
create index if not exists meetings_initiator_id_idx on public.meetings(initiator_id);
create index if not exists announcements_pinned_idx on public.announcements(pinned, created_at desc);
create index if not exists events_date_idx on public.events(event_date asc);
