-- ============================================================
-- Migration: 002_schema_updates
-- ============================================================

-- ─── Enum Güncellemeleri ──────────────────────────────────────────────────────

ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'auto_cancelled';
ALTER TYPE session_outcome ADD VALUE IF NOT EXISTS 'partial_client';
ALTER TYPE session_outcome ADD VALUE IF NOT EXISTS 'partial_psychologist';

-- ─── payments tablosu güncellemeleri ─────────────────────────────────────────

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- ─── appointments tablosu güncellemeleri ─────────────────────────────────────

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_deadline TIMESTAMPTZ, -- created_at + 24 saat
  ADD COLUMN IF NOT EXISTS slot_start_time TIMESTAMPTZ;   -- denormalize, sorgu kolaylığı

-- ─── completed_sessions tablosu güncellemeleri ───────────────────────────────

ALTER TABLE completed_sessions
  ADD COLUMN IF NOT EXISTS client_joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS psychologist_joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS psychologist_left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INT;

-- ─── Yeni Tablo: psychologist_recommendations ────────────────────────────────
-- Psikolog reddettiğinde müşteriye önerilen alternatif psikologları takip eder

CREATE TABLE IF NOT EXISTS psychologist_recommendations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_payment_id UUID NOT NULL REFERENCES payments(id),
  client_id           UUID NOT NULL REFERENCES users(id),
  recommended_psych_id UUID NOT NULL REFERENCES users(id),
  suggested_slot_id   UUID REFERENCES slots(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'ignored')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Yeni Tablo: notification_schedules ──────────────────────────────────────
-- 0/12/20. saat psikolog hatırlatmalarını zamanlar

CREATE TABLE IF NOT EXISTS notification_schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,  -- Ne zaman gönderilecek
  sent_at         TIMESTAMPTZ,           -- Gönderildiyse ne zaman
  notification_type TEXT NOT NULL        -- 'immediate', 'reminder_12h', 'reminder_4h'
                  CHECK (notification_type IN ('immediate', 'reminder_12h', 'reminder_4h')),
  is_sent         BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_appointments_approval_deadline
  ON appointments(approval_deadline)
  WHERE status = 'pending_approval';

CREATE INDEX IF NOT EXISTS idx_notification_schedules_pending
  ON notification_schedules(scheduled_at)
  WHERE is_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_recommendations_client
  ON psychologist_recommendations(client_id, status);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE psychologist_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommendations: client read" ON psychologist_recommendations
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "notification_schedules: system only" ON notification_schedules
  FOR ALL USING (current_user_role() = 'admin');

-- ─── Trigger: appointment oluşturulunca approval_deadline ve schedule'ları otomatik set et ──

CREATE OR REPLACE FUNCTION on_appointment_created()
RETURNS TRIGGER AS $$
BEGIN
  -- 24 saatlik onay süresi
  NEW.approval_deadline := NEW.created_at + INTERVAL '24 hours';

  -- Slot başlangıç saatini denormalize et
  SELECT start_time INTO NEW.slot_start_time
    FROM slots WHERE id = NEW.slot_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_created
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION on_appointment_created();

-- Bildirim zamanlamalarını oluşturan fonksiyon (INSERT sonrası çağrılır)
CREATE OR REPLACE FUNCTION schedule_approval_notifications(p_appointment_id UUID, p_psychologist_id UUID, p_created_at TIMESTAMPTZ)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notification_schedules (appointment_id, user_id, scheduled_at, notification_type) VALUES
    (p_appointment_id, p_psychologist_id, p_created_at,                          'immediate'),
    (p_appointment_id, p_psychologist_id, p_created_at + INTERVAL '12 hours',    'reminder_12h'),
    (p_appointment_id, p_psychologist_id, p_created_at + INTERVAL '20 hours',    'reminder_4h');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Fonksiyon: 24 saat dolunca otomatik red ─────────────────────────────────
-- Bu fonksiyon bir cron job ile her 5 dakikada bir çağrılır (Supabase pg_cron)

CREATE OR REPLACE FUNCTION auto_reject_expired_appointments()
RETURNS void AS $$
DECLARE
  v_appointment RECORD;
BEGIN
  FOR v_appointment IN
    SELECT a.id, a.slot_id, a.payment_id, a.client_id, a.psychologist_id
      FROM appointments a
     WHERE a.status = 'pending_approval'
       AND a.approval_deadline < NOW()
  LOOP
    -- Randevuyu otomatik iptal et
    UPDATE appointments
       SET status = 'auto_cancelled',
           rejected_at = NOW(),
           rejection_reason = 'Psikolog 24 saat içinde yanıt vermedi'
     WHERE id = v_appointment.id;

    -- Slotu serbest bırak
    UPDATE slots
       SET status = 'available'
     WHERE id = v_appointment.slot_id;

    -- sessions_used'ı geri ver
    UPDATE payments
       SET sessions_used = GREATEST(sessions_used - 1, 0)
     WHERE id = v_appointment.payment_id;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Cron Job: her 5 dakikada auto_reject çalıştır ───────────────────────────
-- Supabase dashboard'da Database > Extensions > pg_cron aktif edilmeli

SELECT cron.schedule(
  'auto-reject-expired-appointments',
  '*/5 * * * *',
  'SELECT auto_reject_expired_appointments()'
);
