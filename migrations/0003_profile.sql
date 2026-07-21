-- Minimal shooter Profile entity + accounts.email — registration wizard now
-- also collects a first/last-name (UA + optional EN), gender, birth date, and
-- optional UPSF/IPSC membership hints, plus a deferred email-collection step.
-- Source: Obsidian KB products/match-platform/specs/login-implementation.md
-- ("Додано 2026-07-18 — мінімальний Profile при реєстрації"),
-- products/match-platform/specs/user-profile.md, products/match-platform/specs/notifications.md.
-- Deliberately excludes club/division/power_factor/upsf_rank/ipsc_class and
-- creator_account_id/merged_into_profile_id/selected_club_id — those need
-- reference dictionaries and a Club entity that don't exist in this repo yet
-- (future match-registration-form feature). See
-- docs/plans/auth-registration-plan.md for the accepted scope.

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0003')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- Convenience contact/notify address only — not OTP/verify-gated in v1.
ALTER TABLE accounts ADD COLUMN email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id),
  first_name_ua TEXT NOT NULL,
  last_name_ua TEXT NOT NULL,
  first_name_en TEXT,
  last_name_en TEXT,
  nickname TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('male','female')),
  birth_date TEXT NOT NULL, -- ISO date (YYYY-MM-DD)
  upsf_member INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
  region TEXT,
  city TEXT,
  ipsc_member INTEGER NOT NULL DEFAULT 0,
  ipsc_member_number TEXT,
  ipsc_region TEXT, -- free text, uppercase, max 5 chars, default 'UA' when ipsc_member checked and left blank
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
