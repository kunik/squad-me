-- Dismissal flag for the (optional, post-registration) "profile data" step
-- prompt. Set by `POST /api/auth/account/profile-prompt/dismiss` when the
-- user explicitly skips that step. `GET /api/auth/me` computes
-- `showProfilePrompt = profile_prompt_dismissed_at IS NULL AND
-- profiles.profile_completed_at IS NULL` (see migrations/0005 and
-- docs/plans/auth-registration-plan.md).

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0006')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

ALTER TABLE accounts ADD COLUMN profile_prompt_dismissed_at TEXT;
