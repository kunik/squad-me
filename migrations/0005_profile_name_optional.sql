-- Relaxes `profiles` so a row can exist with only a `nickname` (the
-- account-creation-time upsert — see docs/plans/auth-registration-plan.md,
-- "Corrected wizard order"): first_name_ua, last_name_ua, gender, and
-- birth_date all become nullable, and there is no cross-field
-- name-completeness rule anymore (nickname from the password step already
-- guarantees every account has *some* identity; the fuller profile step is
-- entirely optional and must be skippable with zero fields).
--
-- Also adds `profile_completed_at` — set by `POST /api/profile` only when a
-- request actually includes both `gender` and `birthDate` (i.e. a real save
-- of the fuller profile step, not the nickname-only upsert). Used by
-- `GET /api/auth/me`'s `showProfilePrompt` computation.
--
-- SQLite has no ALTER COLUMN to drop a NOT NULL constraint or change a CHECK,
-- so this rebuilds the table: create new -> copy data -> drop old -> rename.
-- Column list mirrors the current shape of `profiles` (migrations 0003 +
-- 0004, i.e. including `club`).

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0005')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

PRAGMA foreign_keys=OFF;

CREATE TABLE profiles_new (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id),
  first_name_ua TEXT,
  last_name_ua TEXT,
  first_name_en TEXT,
  last_name_en TEXT,
  nickname TEXT,
  gender TEXT CHECK (gender IS NULL OR gender IN ('male','female')),
  birth_date TEXT, -- ISO date (YYYY-MM-DD)
  upsf_member INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
  region TEXT,
  city TEXT,
  club TEXT, -- temporary free-text placeholder, no Club entity yet (see migrations/0004_profile_club.sql)
  ipsc_member INTEGER NOT NULL DEFAULT 0,
  ipsc_member_number TEXT,
  ipsc_region TEXT,
  profile_completed_at TEXT, -- set when a request includes both gender + birth_date (a real "profile data" step save)
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO profiles_new (
  id, account_id, first_name_ua, last_name_ua, first_name_en, last_name_en,
  nickname, gender, birth_date, upsf_member, region, city, club, ipsc_member,
  ipsc_member_number, ipsc_region, created_at, updated_at
)
SELECT
  id, account_id, first_name_ua, last_name_ua, first_name_en, last_name_en,
  nickname, gender, birth_date, upsf_member, region, city, club, ipsc_member,
  ipsc_member_number, ipsc_region, created_at, updated_at
FROM profiles;

DROP TABLE profiles;
ALTER TABLE profiles_new RENAME TO profiles;

PRAGMA foreign_keys=ON;
