-- Dismissal flag for the (optional, post-registration) email / notification-
-- channels step. Set by `POST /api/auth/account/email-prompt/dismiss` when
-- the user explicitly skips. `GET /api/auth/me` computes
-- `onboardingStep` with priority profile → email → null:
--   "profile" when profile_prompt_dismissed_at IS NULL AND
--     profiles.profile_completed_at IS NULL
--   "email" when email_prompt_dismissed_at IS NULL AND accounts.email IS NULL
--   null otherwise
-- Existing accounts with null dismissal and no email will see the email
-- prompt once (simple default — no backfill). See
-- docs/plans/auth-registration-plan.md.

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0007')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

ALTER TABLE accounts ADD COLUMN email_prompt_dismissed_at TEXT;
