-- Bootstrap schema placeholder. Domain tables land with feature work.
-- CI applies from scratch and upgrade-path checks against this baseline.

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0001')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

CREATE TABLE IF NOT EXISTS seed_runs (
  id TEXT PRIMARY KEY NOT NULL,
  environment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
