-- Dismissal / completion flag for the (optional, post-profile) divisions /
-- power-factor onboarding step. Set by
-- `POST /api/auth/account/disciplines-prompt/dismiss` on Skip, or by a
-- successful `POST /api/profile` with `section: "disciplines"`.
-- `GET /api/auth/me` computes `onboardingStep` with priority
-- profile → disciplines → email → null:
--   "profile" when profile_prompt_dismissed_at IS NULL AND
--     profiles.profile_completed_at IS NULL
--   "disciplines" when disciplines_prompt_dismissed_at IS NULL AND
--     no discipline is enabled yet
--   "email" when email_prompt_dismissed_at IS NULL AND accounts.email IS NULL
--   null otherwise
-- Existing accounts with null dismissal and no enabled discipline will see
-- the disciplines prompt once (simple default — no backfill). See
-- docs/plans/auth-registration-plan.md.

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0010')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

ALTER TABLE accounts ADD COLUMN disciplines_prompt_dismissed_at TEXT;
