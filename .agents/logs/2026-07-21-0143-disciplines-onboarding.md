# Disciplines onboarding step

**Date:** 2026-07-21
**Repo:** squad-me
**Status:** implemented (uncommitted)

## Summary

Inserted a server-driven post-auth onboarding step **`disciplines`** between
`profile` and `email`. Same HintPanel / Skip / auto-edit pattern as profile;
divisions remain independently editable afterward.

## `onboardingStep` order

1. `"profile"` — `profile_prompt_dismissed_at` null AND no `profile_completed_at`
2. `"disciplines"` — `disciplines_prompt_dismissed_at` null AND no enabled discipline
3. `"email"` — `email_prompt_dismissed_at` null AND no `accounts.email`
4. `null`

## Flags / APIs

- Migration `0010_disciplines_prompt_dismissal.sql` →
  `accounts.disciplines_prompt_dismissed_at`
- Skip: `POST /api/auth/account/disciplines-prompt/dismiss`
- Save: `POST /api/profile` with `section: "disciplines"` stamps dismissal
  (even if all disciplines stay disabled)
- Legacy: any already-enabled discipline skips the step without a dismiss stamp

## Client

- Hint UA: «Додайте свій дивізіон та фактор потужності — вибір за замовчуванням
  для наступних реєстрацій.»
- Hint EN: «Add your division and power factor — defaults for future match
  registrations.»
- Skip reuses `profileSkip`
- Auto-opens divisions edit + scrolls to `#my-divisions`; advance to email
  scrolls to `#my-notifications`

## Docs / KB

- `docs/plans/auth-registration-plan.md` + `docs/regression.md` PROFILE-002
- Obsidian: `design/screens/user-profile.md`, `products/match-platform/notes.md`
  (revises earlier “divisions never an onboarding step”)
