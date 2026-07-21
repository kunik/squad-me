-- Shooter discipline blocks on Profile: pistol / carbine / pcc_mini_rifle /
-- shotgun, each with enabled + division + power_factor.
-- Source: Obsidian products/match-platform/specs/user-profile.md,
-- products/match-platform/specs/divisions-classes.md.
-- Defaults when enabled: pistol/carbine/pcc_mini_rifle → Minor; shotgun → Major.
-- Division allow-lists are enforced in app code (profile.ts), not CHECK —
-- federation-union sets can grow without another table rebuild.

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0008')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

ALTER TABLE profiles ADD COLUMN pistol_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN pistol_division TEXT;
ALTER TABLE profiles ADD COLUMN pistol_power_factor TEXT;

ALTER TABLE profiles ADD COLUMN carbine_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN carbine_division TEXT;
ALTER TABLE profiles ADD COLUMN carbine_power_factor TEXT;

ALTER TABLE profiles ADD COLUMN pcc_mini_rifle_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN pcc_mini_rifle_division TEXT;
ALTER TABLE profiles ADD COLUMN pcc_mini_rifle_power_factor TEXT;

ALTER TABLE profiles ADD COLUMN shotgun_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN shotgun_division TEXT;
ALTER TABLE profiles ADD COLUMN shotgun_power_factor TEXT;
