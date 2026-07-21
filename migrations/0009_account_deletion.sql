-- Account deletion keeps opaque tombstones so current/future match-registration
-- foreign keys remain valid, while removing login capability and profile PII.
-- The profile keeps its opaque tombstone Account link; a later registration
-- with the same phone creates a new Account + Profile.

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0009')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

ALTER TABLE accounts ADD COLUMN deleted_at TEXT;

-- Canonical Registration points at Profile, while some registration/audit
-- records may also retain an Account actor/creator reference. Keep both opaque
-- rows as non-authenticating tombstones instead of cascading match history.
-- account_id also becomes nullable with ON DELETE SET NULL as a defensive FK
-- seam for future maintenance, although the deletion endpoint retains the
-- tombstone Account link for registration actor/creator integrity.
PRAGMA foreign_keys=OFF;

CREATE TABLE profiles_new (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT UNIQUE REFERENCES accounts(id) ON DELETE SET NULL,
  first_name_ua TEXT,
  last_name_ua TEXT,
  first_name_en TEXT,
  last_name_en TEXT,
  nickname TEXT,
  gender TEXT CHECK (gender IS NULL OR gender IN ('male','female')),
  birth_date TEXT,
  upsf_member INTEGER NOT NULL DEFAULT 0,
  region TEXT,
  city TEXT,
  club TEXT,
  ipsc_member INTEGER NOT NULL DEFAULT 0,
  ipsc_member_number TEXT,
  ipsc_region TEXT,
  pistol_enabled INTEGER NOT NULL DEFAULT 0,
  pistol_division TEXT,
  pistol_power_factor TEXT,
  carbine_enabled INTEGER NOT NULL DEFAULT 0,
  carbine_division TEXT,
  carbine_power_factor TEXT,
  pcc_mini_rifle_enabled INTEGER NOT NULL DEFAULT 0,
  pcc_mini_rifle_division TEXT,
  pcc_mini_rifle_power_factor TEXT,
  shotgun_enabled INTEGER NOT NULL DEFAULT 0,
  shotgun_division TEXT,
  shotgun_power_factor TEXT,
  profile_completed_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO profiles_new (
  id, account_id, first_name_ua, last_name_ua, first_name_en, last_name_en,
  nickname, gender, birth_date, upsf_member, region, city, club, ipsc_member,
  ipsc_member_number, ipsc_region,
  pistol_enabled, pistol_division, pistol_power_factor,
  carbine_enabled, carbine_division, carbine_power_factor,
  pcc_mini_rifle_enabled, pcc_mini_rifle_division, pcc_mini_rifle_power_factor,
  shotgun_enabled, shotgun_division, shotgun_power_factor,
  profile_completed_at, created_at, updated_at
)
SELECT
  id, account_id, first_name_ua, last_name_ua, first_name_en, last_name_en,
  nickname, gender, birth_date, upsf_member, region, city, club, ipsc_member,
  ipsc_member_number, ipsc_region,
  pistol_enabled, pistol_division, pistol_power_factor,
  carbine_enabled, carbine_division, carbine_power_factor,
  pcc_mini_rifle_enabled, pcc_mini_rifle_division, pcc_mini_rifle_power_factor,
  shotgun_enabled, shotgun_division, shotgun_power_factor,
  profile_completed_at, created_at, updated_at
FROM profiles;

DROP TABLE profiles;
ALTER TABLE profiles_new RENAME TO profiles;

PRAGMA foreign_keys=ON;
