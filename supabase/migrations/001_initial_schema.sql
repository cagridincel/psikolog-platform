-- ============================================================
-- Migration: 001_initial_schema
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM Types ───────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('client', 'psychologist', 'admin');
CREATE TYPE appointment_status AS ENUM ('pending_approval', 'scheduled', 'completed', 'cancelled');
CREATE TYPE slot_status AS ENUM ('available', 'requested', 'booked');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE session_outcome AS ENUM ('attended', 'client_no_show', 'psychologist_no_show', 'technical_issue');

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL UNIQUE,
  role       user_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  avatar_url        TEXT,
  bio               TEXT,
  specialties       TEXT[] NOT NULL DEFAULT '{}',
  price_per_session NUMERIC(10, 2),
  is_approved       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE slots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ NOT NULL,
  status           slot_status NOT NULL DEFAULT 'available',
  CONSTRAINT slots_time_check CHECK (end_time > start_time)
);

CREATE TABLE payments (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id                UUID NOT NULL REFERENCES users(id),
  psychologist_id          UUID NOT NULL REFERENCES users(id),
  amount_paid              NUMERIC(10, 2) NOT NULL,
  total_sessions_credited  INT NOT NULL DEFAULT 3,
  sessions_used            INT NOT NULL DEFAULT 0,
  iyzico_payment_id        TEXT,
  status                   payment_status NOT NULL DEFAULT 'pending',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_used_check CHECK (sessions_used <= total_sessions_credited)
);

CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id       UUID NOT NULL REFERENCES payments(id),
  client_id        UUID NOT NULL REFERENCES users(id),
  psychologist_id  UUID NOT NULL REFERENCES users(id),
  slot_id          UUID NOT NULL UNIQUE REFERENCES slots(id),
  status           appointment_status NOT NULL DEFAULT 'pending_approval',
  meeting_room_url TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE completed_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id    UUID NOT NULL UNIQUE REFERENCES appointments(id),
  client_id         UUID NOT NULL REFERENCES users(id),
  psychologist_id   UUID NOT NULL REFERENCES users(id),
  actual_start_time TIMESTAMPTZ NOT NULL,
  actual_end_time   TIMESTAMPTZ NOT NULL,
  duration_minutes  INT NOT NULL,
  outcome           session_outcome NOT NULL,
  clinical_notes    TEXT  -- Sadece psikolog okuyabilir (RLS ile korunuyor)
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_slots_psychologist_status ON slots(psychologist_id, status);
CREATE INDEX idx_slots_start_time ON slots(start_time);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_psychologist ON appointments(psychologist_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;

-- Helper: mevcut kullanıcının rolünü döndürür
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── users ──
-- Herkes kendi satırını okuyabilir; admin hepsini görebilir
CREATE POLICY "users: self read" ON users
  FOR SELECT USING (id = auth.uid() OR current_user_role() = 'admin');

CREATE POLICY "users: self update" ON users
  FOR UPDATE USING (id = auth.uid());

-- ── profiles ──
-- Onaylı psikolog profilleri herkese açık; kendi profilini herkes yönetebilir
CREATE POLICY "profiles: public read approved psychologists" ON profiles
  FOR SELECT USING (
    is_approved = TRUE
    OR id = auth.uid()
    OR current_user_role() = 'admin'
  );

CREATE POLICY "profiles: owner update" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles: owner insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ── slots ──
-- Herkes 'available' slotları görebilir; psikolog kendi slotlarını yönetir
CREATE POLICY "slots: public read available" ON slots
  FOR SELECT USING (
    status = 'available'
    OR psychologist_id = auth.uid()
    OR current_user_role() = 'admin'
  );

CREATE POLICY "slots: psychologist insert" ON slots
  FOR INSERT WITH CHECK (
    psychologist_id = auth.uid()
    AND current_user_role() = 'psychologist'
  );

CREATE POLICY "slots: psychologist update" ON slots
  FOR UPDATE USING (
    psychologist_id = auth.uid()
    OR current_user_role() = 'admin'
  );

CREATE POLICY "slots: psychologist delete" ON slots
  FOR DELETE USING (
    psychologist_id = auth.uid()
    AND status = 'available'
  );

-- ── payments ──
CREATE POLICY "payments: client or psychologist read" ON payments
  FOR SELECT USING (
    client_id = auth.uid()
    OR psychologist_id = auth.uid()
    OR current_user_role() = 'admin'
  );

CREATE POLICY "payments: client insert" ON payments
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
    AND current_user_role() = 'client'
  );

-- sessions_used sadece sistem (service role) tarafından güncellenir
CREATE POLICY "payments: admin update" ON payments
  FOR UPDATE USING (current_user_role() = 'admin');

-- ── appointments ──
CREATE POLICY "appointments: participant read" ON appointments
  FOR SELECT USING (
    client_id = auth.uid()
    OR psychologist_id = auth.uid()
    OR current_user_role() = 'admin'
  );

CREATE POLICY "appointments: client insert" ON appointments
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
    AND current_user_role() = 'client'
  );

CREATE POLICY "appointments: psychologist update status" ON appointments
  FOR UPDATE USING (
    psychologist_id = auth.uid()
    OR current_user_role() = 'admin'
  );

-- ── completed_sessions ──
-- ÖNEMLİ: clinical_notes client tarafından okunamaz — column-level korunma
-- Supabase column-level security desteklemediği için view ile çözülüyor:

-- Client için clinical_notes gizlenen view
CREATE VIEW client_completed_sessions AS
  SELECT
    id,
    appointment_id,
    client_id,
    psychologist_id,
    actual_start_time,
    actual_end_time,
    duration_minutes,
    outcome
    -- clinical_notes kasıtlı olarak dahil edilmedi
  FROM completed_sessions
  WHERE client_id = auth.uid();

-- Tablo-level policy: psikolog + admin tam erişim; client sadece view üzerinden erişir
CREATE POLICY "completed_sessions: psychologist read" ON completed_sessions
  FOR SELECT USING (
    psychologist_id = auth.uid()
    OR current_user_role() = 'admin'
  );

CREATE POLICY "completed_sessions: psychologist insert" ON completed_sessions
  FOR INSERT WITH CHECK (
    psychologist_id = auth.uid()
    AND current_user_role() = 'psychologist'
  );

CREATE POLICY "completed_sessions: psychologist update own" ON completed_sessions
  FOR UPDATE USING (psychologist_id = auth.uid());

-- ── notifications ──
CREATE POLICY "notifications: owner read" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications: owner update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Bildirim oluşturma sadece service role üzerinden yapılır (Next.js API route)
-- Client tarafından INSERT'e izin verilmez

-- ─── Helper Functions ─────────────────────────────────────────────────────────

-- Randevu iptalinde slot'u serbest bırakır ve sessions_used'ı geri verir
CREATE OR REPLACE FUNCTION cancel_appointment(p_appointment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_slot_id   UUID;
  v_payment_id UUID;
BEGIN
  SELECT slot_id, payment_id
    INTO v_slot_id, v_payment_id
    FROM appointments
   WHERE id = p_appointment_id;

  UPDATE appointments
     SET status = 'cancelled'
   WHERE id = p_appointment_id;

  UPDATE slots
     SET status = 'available'
   WHERE id = v_slot_id;

  UPDATE payments
     SET sessions_used = GREATEST(sessions_used - 1, 0)
   WHERE id = v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kalan seans sayısını döndürür
CREATE OR REPLACE FUNCTION remaining_sessions(p_payment_id UUID)
RETURNS INT AS $$
  SELECT total_sessions_credited - sessions_used
    FROM payments
   WHERE id = p_payment_id
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
