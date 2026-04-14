-- ================================================
-- Миграция: уведомления при изменении статуса встречи
-- Запусти в Supabase SQL Editor
-- ================================================

-- Триггер на UPDATE встречи: уведомляет нужного участника при смене статуса
CREATE OR REPLACE FUNCTION notify_on_meeting_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_notified_profile_id UUID;
  v_notified_auth_id    UUID;
  v_actor_name          TEXT;
  v_notif_type          TEXT;
  v_notif_title         TEXT;
  v_notif_body          TEXT;
BEGIN
  -- Срабатываем только при смене статуса
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT full_name INTO v_actor_name FROM profiles WHERE id = NEW.proposed_by;

  IF NEW.status = 'confirmed' THEN
    -- Уведомляем инициатора (proposed_by): его встречу подтвердили
    v_notified_profile_id := NEW.proposed_by;
    v_notif_type  := 'meeting_confirmed';
    v_notif_title := 'Встреча подтверждена! ✅';
    v_notif_body  := 'Собеседник подтвердил твоё приглашение';

  ELSIF NEW.status = 'declined' THEN
    -- Уведомляем инициатора (proposed_by): его встречу отклонили
    v_notified_profile_id := NEW.proposed_by;
    v_notif_type  := 'meeting_declined';
    v_notif_title := 'Встреча отклонена';
    v_notif_body  := 'Собеседник не сможет встретиться в это время';

  ELSIF NEW.status = 'reschedule_requested' THEN
    -- Партнёр предлагает другое время → уведомляем ДРУГОГО участника
    SELECT
      CASE WHEN m.user_a_id = NEW.proposed_by THEN m.user_b_id ELSE m.user_a_id END
    INTO v_notified_profile_id
    FROM matches m WHERE m.id = NEW.match_id;
    v_notif_type  := 'meeting_proposed';
    v_notif_title := 'Предложено другое время ⏰';
    v_notif_body  := COALESCE(v_actor_name, 'Собеседник') || ' предлагает перенести встречу';

  ELSIF NEW.status = 'awaiting_response' AND OLD.status IS DISTINCT FROM 'awaiting_response' THEN
    -- Повторное предложение после отклонения → уведомляем ДРУГОГО участника
    SELECT
      CASE WHEN m.user_a_id = NEW.proposed_by THEN m.user_b_id ELSE m.user_a_id END
    INTO v_notified_profile_id
    FROM matches m WHERE m.id = NEW.match_id;
    v_notif_type  := 'meeting_proposed';
    v_notif_title := 'Тебя снова приглашают на встречу!';
    v_notif_body  := COALESCE(v_actor_name, 'Собеседник') || ' предлагает встретиться';

  ELSE
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_notified_auth_id FROM profiles WHERE id = v_notified_profile_id;

  IF v_notified_auth_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (v_notified_auth_id, v_notif_type, v_notif_title, v_notif_body, '/matches');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_meeting_update ON meetings;
CREATE TRIGGER trg_notify_meeting_update
  AFTER UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION notify_on_meeting_status_change();
