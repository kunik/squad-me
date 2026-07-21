-- Identity/auth schema: password + phone-OTP registration, sessions, rate limits.
-- Phase 5 stub tables (account_telegram_links, push_subscriptions) ship here too —
-- no send pipeline, just the storage shape so the profile UI can add placeholders.
-- See docs/plans/auth-registration-plan.md for the accepted model.

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0002')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  phone_e164 TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone_verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT,
  ip_hash TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions (account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- Purpose values: 'register' | 'password_reset' | 'change_phone'.
-- (phone_e164, purpose, created_at) index backs both the 30s resend-cooldown
-- lookup and the per-phone send count (see rate-limit.ts for current caps).
CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  phone_e164 TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  verified_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_phone_purpose_created
  ON auth_challenges (phone_e164, purpose, created_at);
-- Backs the per-IP send count (see rate-limit.ts for current caps).
CREATE INDEX IF NOT EXISTS idx_auth_challenges_ip_created
  ON auth_challenges (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS phone_proofs (
  id TEXT PRIMARY KEY NOT NULL,
  phone_e164 TEXT NOT NULL,
  purpose TEXT NOT NULL,
  challenge_id TEXT NOT NULL REFERENCES auth_challenges(id),
  proof_hash TEXT NOT NULL UNIQUE,
  account_id TEXT REFERENCES accounts(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_phone_proofs_expires ON phone_proofs (expires_at);

-- Generic login-lockout counters. scope: 'login_account' | 'login_ip'.
-- subject: account id or hashed IP. Not time-bucketed — first_failed_at anchors
-- a rolling window that rate-limit.ts resets once it elapses.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  scope TEXT NOT NULL,
  subject TEXT NOT NULL,
  fail_count INTEGER NOT NULL DEFAULT 0,
  first_failed_at TEXT,
  locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (scope, subject)
);

-- Phase 5 stubs — storage shape only, no send pipeline (separate Bot/Web Push track).
CREATE TABLE IF NOT EXISTS account_telegram_links (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id),
  telegram_user_id TEXT NOT NULL UNIQUE,
  telegram_chat_id TEXT,
  linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_account ON push_subscriptions (account_id);
