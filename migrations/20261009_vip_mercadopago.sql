ALTER TABLE profiles
  ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'free'
  CHECK (subscription_status IN ('free', 'active', 'expired'));

ALTER TABLE profiles
  ADD COLUMN subscription_expires_at TEXT;

CREATE TABLE IF NOT EXISTS vip_payments (
  external_reference TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('mensal', 'trimestral')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'card')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents IN (1990, 4990)),
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'pending', 'processing', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back', 'failed')),
  mp_payment_id TEXT UNIQUE,
  processing_token TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS vip_payments_user_created_idx
  ON vip_payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vip_payments_mp_payment_idx
  ON vip_payments (mp_payment_id);
