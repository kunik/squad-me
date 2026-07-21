-- Short-lived step-up proofs after authenticated phone+password reauth.
-- Consumed by sensitive actions (currently phone/change) instead of re-sending
-- the password. Purpose values: 'change_phone' (extensible later).

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0011')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

CREATE TABLE IF NOT EXISTS reauth_proofs (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  purpose TEXT NOT NULL,
  proof_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_reauth_proofs_expires ON reauth_proofs (expires_at);
CREATE INDEX IF NOT EXISTS idx_reauth_proofs_account ON reauth_proofs (account_id);
