-- Temporary free-text `club` field on `profiles` — placeholder until a real
-- `Club` entity/dictionary exists in this repo (future match-registration-
-- form feature). No lookup/dropdown; plain user-typed text, same defensive
-- length cap as other free-text profile fields. See
-- docs/plans/auth-registration-plan.md.

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0004')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

ALTER TABLE profiles ADD COLUMN club TEXT;
