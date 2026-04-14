-- ================================================
-- Миграция: чат и уведомления
-- Запусти в Supabase SQL Editor
-- ================================================

-- ── Messages (in-app chat) ────────────────────────
create table if not exists public.messages (
  id          uuid        primary key default gen_random_uuid(),
  match_id    uuid        not null references public.matches(id) on delete cascade,
  sender_id   uuid        not null references public.profiles(id) on delete cascade,
  body        text        not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists messages_match_id_idx    on public.messages(match_id, created_at);
create index if not exists messages_sender_id_idx   on public.messages(sender_id);

alter table public.messages enable row level security;

-- Participants of the match can read
create policy "Match participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      join public.profiles p on p.user_id = auth.uid()
      where m.id = messages.match_id
        and (m.participant_a = p.id or m.participant_b = p.id)
    )
  );

-- Participants can insert (only as themselves)
create policy "Match participants can send messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.matches m
      join public.profiles p on p.user_id = auth.uid()
      where m.id = messages.match_id
        and (m.participant_a = p.id or m.participant_b = p.id)
        and p.id = sender_id
    )
  );

-- Sender can update (e.g. mark read)
create policy "Sender can update messages"
  on public.messages for update
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.id = sender_id
    )
  );

-- Realtime: enable for messages
alter publication supabase_realtime add table public.messages;

-- ── Notifications ─────────────────────────────────
create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  type       text        not null,
  title      text        not null,
  body       text,
  link       text,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, read, created_at desc);

alter table public.notifications enable row level security;

create policy "Users manage own notifications"
  on public.notifications for all
  using (auth.uid() = user_id);

-- Realtime for notifications
alter publication supabase_realtime add table public.notifications;
