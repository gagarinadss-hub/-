-- ================================================
-- Миграция: поля для умного матчинга
-- Выполни в Supabase SQL Editor
-- ================================================

alter table public.profiles
  add column if not exists interests    text[]  not null default '{}',
  add column if not exists matching_goals text[] not null default '{}',
  add column if not exists preferred_format text not null default 'any',
  add column if not exists is_active    boolean not null default true;

create index if not exists profiles_is_active_idx on public.profiles(is_active);
create index if not exists profiles_format_idx    on public.profiles(preferred_format);
