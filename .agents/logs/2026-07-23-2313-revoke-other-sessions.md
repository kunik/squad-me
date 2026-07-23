# Revoke other sessions (profile)

## Summary
Enabled “Sign out everywhere” on profile: password step-up dialog calls
`POST /api/auth/sessions/revoke-others`, which keeps the current session and
revokes all others.

## Key decisions
- Password confirmation required (not a one-click revoke).
- Current device stays signed in; success HintPanel on profile.
- Wire existing `revokeAllOtherSessions` helper via new auth route.

## Files changed
- `src/worker/identity/routes.ts` (+ test), `authApi.ts`, `ProfilePage.tsx`,
  `ProfileAside.tsx`, `i18n.ts`, `styles.css` (drop soon badge),
  `docs/plans/auth-registration-plan.md`

## Verification
- `npx vitest run src/worker/identity/routes.test.ts` (focused revoke-others case)

## Pending
- None for this commit.
