-- =============================================================
-- Random Coffee — Full Schema Rebuild
-- Run once. Drops all app tables and recreates them cleanly.
-- =============================================================

-- ── 0. Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Drop old tables (reverse FK order) ─────────────────────
DROP TABLE IF EXISTS user_activity     CASCADE;
DROP TABLE IF EXISTS events            CASCADE;
DROP TABLE IF EXISTS notifications     CASCADE;
DROP TABLE IF EXISTS messages          CASCADE;
DROP TABLE IF EXISTS meeting_feedback  CASCADE;
DROP TABLE IF EXISTS meetings          CASCADE;
DROP TABLE IF EXISTS matches           CASCADE;
DROP TABLE IF EXISTS profiles          CASCADE;

-- ── 2. profiles ───────────────────────────────────────────────
CREATE TABLE profiles (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name                  TEXT NOT NULL DEFAULT '',
  username                   TEXT UNIQUE,
  city                       TEXT,
  bio                        TEXT,
  profession                 TEXT,
  interests                  TEXT[]  NOT NULL DEFAULT '{}',
  goals                      TEXT,
  help_with                  TEXT,
  looking_for                TEXT[]  NOT NULL DEFAULT '{}',
  avatar_url                 TEXT,
  is_admin                   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active                  BOOLEAN NOT NULL DEFAULT TRUE,
  allow_notifications        BOOLEAN NOT NULL DEFAULT TRUE,
  allow_sound_notifications  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. matches ────────────────────────────────────────────────
CREATE TABLE matches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','declined','completed','expired')),
  match_reason TEXT,
  score        SMALLINT CHECK (score BETWEEN 0 AND 100),
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_match CHECK (user_a_id <> user_b_id)
);

-- ── 4. meetings ───────────────────────────────────────────────
CREATE TABLE meetings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  proposed_by      UUID NOT NULL REFERENCES profiles(id),
  scheduled_at     TIMESTAMPTZ,
  format           TEXT CHECK (format IN ('online','offline','any')),
  location_or_link TEXT,
  comment          TEXT,
  status           TEXT NOT NULL DEFAULT 'awaiting_response'
                     CHECK (status IN ('awaiting_response','confirmed','declined','reschedule_requested','completed','cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. meeting_feedback ───────────────────────────────────────
CREATE TABLE meeting_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating       SMALLINT CHECK (rating BETWEEN 1 AND 5),
  want_again   BOOLEAN,
  comment      TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (meeting_id, user_id)
);

-- ── 6. messages ───────────────────────────────────────────────
CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_message CHECK (sender_id <> receiver_id)
);

-- ── 7. notifications ──────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'info',
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. events ─────────────────────────────────────────────────
CREATE TABLE events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  event_date       TIMESTAMPTZ,
  format           TEXT CHECK (format IN ('online','offline','hybrid')),
  location_or_link TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. user_activity ──────────────────────────────────────────
CREATE TABLE user_activity (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_for_matching BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================================
-- INDEXES
-- =============================================================

-- profiles
CREATE INDEX idx_profiles_user_id   ON profiles(user_id);
CREATE INDEX idx_profiles_username  ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_active    ON profiles(is_active);

-- matches
CREATE INDEX idx_matches_user_a     ON matches(user_a_id);
CREATE INDEX idx_matches_user_b     ON matches(user_b_id);
CREATE INDEX idx_matches_status     ON matches(status);
CREATE INDEX idx_matches_created    ON matches(created_at DESC);

-- meetings
CREATE INDEX idx_meetings_match     ON meetings(match_id);
CREATE INDEX idx_meetings_proposed  ON meetings(proposed_by);
CREATE INDEX idx_meetings_status    ON meetings(status);
CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- meeting_feedback
CREATE INDEX idx_feedback_meeting   ON meeting_feedback(meeting_id);
CREATE INDEX idx_feedback_user      ON meeting_feedback(user_id);

-- messages
CREATE INDEX idx_messages_match     ON messages(match_id);
CREATE INDEX idx_messages_sender    ON messages(sender_id);
CREATE INDEX idx_messages_receiver  ON messages(receiver_id);
CREATE INDEX idx_messages_unread    ON messages(receiver_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_messages_created   ON messages(created_at ASC);

-- notifications
CREATE INDEX idx_notifs_user        ON notifications(user_id);
CREATE INDEX idx_notifs_unread      ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_notifs_created     ON notifications(created_at DESC);

-- user_activity
CREATE INDEX idx_activity_user      ON user_activity(user_id);
CREATE INDEX idx_activity_available ON user_activity(available_for_matching)
  WHERE available_for_matching;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity    ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth_profile_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE user_id = auth.uid()),
    FALSE
  )
$$;

-- ── profiles ──────────────────────────────────────────────────
CREATE POLICY "profiles_select"       ON profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE TO authenticated
  USING (is_admin());

-- ── matches ───────────────────────────────────────────────────
CREATE POLICY "matches_select" ON matches FOR SELECT TO authenticated
  USING (user_a_id = auth_profile_id() OR user_b_id = auth_profile_id() OR is_admin());

CREATE POLICY "matches_insert" ON matches FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR created_by = auth_profile_id() OR user_a_id = auth_profile_id());

CREATE POLICY "matches_update" ON matches FOR UPDATE TO authenticated
  USING (user_a_id = auth_profile_id() OR user_b_id = auth_profile_id() OR is_admin());

CREATE POLICY "matches_delete" ON matches FOR DELETE TO authenticated
  USING (is_admin());

-- ── meetings ──────────────────────────────────────────────────
CREATE POLICY "meetings_select" ON meetings FOR SELECT TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM matches m WHERE m.id = match_id
        AND (m.user_a_id = auth_profile_id() OR m.user_b_id = auth_profile_id())
    )
  );

CREATE POLICY "meetings_insert" ON meetings FOR INSERT TO authenticated
  WITH CHECK (
    proposed_by = auth_profile_id() AND
    EXISTS (
      SELECT 1 FROM matches m WHERE m.id = match_id
        AND (m.user_a_id = auth_profile_id() OR m.user_b_id = auth_profile_id())
    )
  );

CREATE POLICY "meetings_update" ON meetings FOR UPDATE TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM matches m WHERE m.id = match_id
        AND (m.user_a_id = auth_profile_id() OR m.user_b_id = auth_profile_id())
    )
  );

-- ── meeting_feedback ──────────────────────────────────────────
CREATE POLICY "feedback_select" ON meeting_feedback FOR SELECT TO authenticated
  USING (user_id = auth_profile_id() OR is_admin());

CREATE POLICY "feedback_insert" ON meeting_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_profile_id());

-- ── messages ──────────────────────────────────────────────────
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
  USING (sender_id = auth_profile_id() OR receiver_id = auth_profile_id() OR is_admin());

CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth_profile_id());

CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated
  USING (receiver_id = auth_profile_id() OR is_admin());

-- ── notifications ─────────────────────────────────────────────
CREATE POLICY "notifs_select" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "notifs_update" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- INSERT allowed for triggers (SECURITY DEFINER bypasses RLS)
-- Admin can also insert manually:
CREATE POLICY "notifs_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- ── events ────────────────────────────────────────────────────
CREATE POLICY "events_select" ON events FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated USING (is_admin());

-- ── user_activity ─────────────────────────────────────────────
CREATE POLICY "activity_select" ON user_activity FOR SELECT TO authenticated
  USING (user_id = auth_profile_id() OR is_admin());

CREATE POLICY "activity_insert" ON user_activity FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_profile_id());

CREATE POLICY "activity_update" ON user_activity FOR UPDATE TO authenticated
  USING (user_id = auth_profile_id());

-- =============================================================
-- TRIGGERS
-- =============================================================

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_matches_updated_at   BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_meetings_updated_at  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Notify on new message ─────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sender_name      TEXT;
  v_receiver_auth_id UUID;
BEGIN
  SELECT full_name INTO v_sender_name
    FROM profiles WHERE id = NEW.sender_id;

  SELECT user_id INTO v_receiver_auth_id
    FROM profiles WHERE id = NEW.receiver_id;

  IF v_receiver_auth_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      v_receiver_auth_id,
      'new_message',
      'Новое сообщение от ' || COALESCE(v_sender_name, 'собеседника'),
      LEFT(NEW.message_text, 100),
      '/chat/' || NEW.match_id::TEXT
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message ON messages;
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();

-- ── Notify on new match ───────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_new_match()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auth_a UUID; v_name_a TEXT;
  v_auth_b UUID; v_name_b TEXT;
BEGIN
  SELECT user_id, full_name INTO v_auth_a, v_name_a FROM profiles WHERE id = NEW.user_a_id;
  SELECT user_id, full_name INTO v_auth_b, v_name_b FROM profiles WHERE id = NEW.user_b_id;

  IF v_auth_a IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (v_auth_a, 'match_found', 'Тебе нашли пару! ☕',
      'Познакомься с ' || COALESCE(v_name_b, 'новым собеседником'), '/matches');
  END IF;

  IF v_auth_b IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (v_auth_b, 'match_found', 'Тебе нашли пару! ☕',
      'Познакомься с ' || COALESCE(v_name_a, 'новым собеседником'), '/matches');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_match ON matches;
CREATE TRIGGER trg_notify_match
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_match();

-- ── Notify on meeting proposed ────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_meeting_proposed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_proposer_name  TEXT;
  v_other_id       UUID;
  v_other_auth_id  UUID;
BEGIN
  SELECT full_name INTO v_proposer_name FROM profiles WHERE id = NEW.proposed_by;

  SELECT
    CASE WHEN m.user_a_id = NEW.proposed_by THEN m.user_b_id ELSE m.user_a_id END
  INTO v_other_id
  FROM matches m WHERE m.id = NEW.match_id;

  SELECT user_id INTO v_other_auth_id FROM profiles WHERE id = v_other_id;

  IF v_other_auth_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      v_other_auth_id,
      'meeting_proposed',
      'Тебя приглашают на встречу!',
      COALESCE(v_proposer_name, 'Собеседник') || ' предлагает встретиться',
      '/matches'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_meeting ON meetings;
CREATE TRIGGER trg_notify_meeting
  AFTER INSERT ON meetings
  FOR EACH ROW EXECUTE FUNCTION notify_on_meeting_proposed();

-- =============================================================
-- REALTIME PUBLICATION
-- =============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
    ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
  END IF;
END
$$;
