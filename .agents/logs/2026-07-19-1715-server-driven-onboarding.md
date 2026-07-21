# Server-driven post-auth onboarding

**When:** 2026-07-19
**Branch:** `feature/bootstrap-basic-site` (uncommitted)

## Decision

Post-auth registration steps (optional profile → optional email) are no
longer owned by `RegisterPage` `useState`. They are driven by
`GET /api/auth/me` → `onboardingStep: null | "profile" | "email"` and
rendered on `/onboarding`. Pre-auth (phone → OTP → password+nickname)
stays an in-page wizard on `/register`.

## Shape

```ts
onboardingStep: "profile" | "email" | null
// Priority: profile (if needed) → email (if needed) → null
// showProfilePrompt kept as alias: onboardingStep === "profile"
```

**Done rules:**
- Profile done = `profile_prompt_dismissed_at` set OR `profile_completed_at` set
- Email done = `email_prompt_dismissed_at` set OR `accounts.email` set

**Existing accounts:** `email_prompt_dismissed_at` defaults NULL — anyone
with no email and null dismissal sees the email step once (simple; no
backfill / no "only new accounts" gate).

## Migrations / APIs

- `migrations/0007_email_prompt_dismissal.sql` — `accounts.email_prompt_dismissed_at`
- `POST /api/auth/account/email-prompt/dismiss` (idempotent)
- Existing: `POST /api/profile`, profile-prompt/dismiss, `POST /api/auth/account/email`

## Client

- `OnboardingGuard` replaces `ProfileCompletionGuard`; forces `/onboarding`
  when authenticated and `onboardingStep != null` (exempt: login/register/
  forgot-password/onboarding; `/complete-profile` → redirect alias)
- `RegisterPage` ends after nickname upsert → `/onboarding`
- `LoginPage` → `/onboarding` if pending (beats `?next=`)
- Shared: `ProfileForm`, `EmailChannelsForm`

## Why

Closing the tab mid-wizard used to drop the email step forever when the
user-only `/complete-profile` recovery path ran. Server-driven steps
make refresh converge.
