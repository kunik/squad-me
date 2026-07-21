# 2026-07-22 · Change-phone reauth proofs + auth regressions

## Summary

Continued `/change-phone` after the 2026-07-21 wizard: step-up now issues a
short-lived `reauthProofToken` via `POST /api/auth/reauth`; `phone/change`
consumes reauth proof + new-phone OTP proof (no password re-send). After phone
or password change, the app logs out and redirects to `/login?notice=…` with a
HintPanel (no dedicated success screens). Signed-in users can open
`/forgot-password` (no longer `RequireGuest`-blocked). Fixed three regressions:
AUTH-003 black screen on `/profile` (`useBlocker` under `BrowserRouter`),
AUTH-004 lost phone-changed notice when `RequireAuth` raced `setAccount(null)`,
AUTH-005 notifications Save with SMS-only left email onboarding stuck.

## Key decisions

- Step-up split: `POST /api/auth/reauth` (phone + password + purpose) →
  single-use hashed `reauth_proofs` row (migration 0011, 10 min TTL); final
  `phone/change` takes `reauthProofToken` + `proofToken` only — reauth consumed
  before OTP proof so failed step-up does not burn OTP.
- Post credential change: always `logout()` first, then login redirect with
  `?notice=phone_changed|password_changed` (HintPanel on LoginPage); no
  in-flow success step.
- `prepareSignOutLoginRedirect` + `buildRequireAuthLoginRedirect`: one-shot
  sign-out notice wins over `?next=` when clearing session on a RequireAuth route
  (fixes `/change-phone` → `/login?next=/change-phone` stealing the notice).
- Navigation blocking: custom `useNavigationBlocker` patches the router navigator
  (BrowserRouter-safe); replaces data-router-only `useBlocker` in
  `useUnsavedDiscard`.
- AUTH-005: SMS-only notifications Save calls `dismissEmailPrompt` like Skip;
  password reset must not clear `email_prompt_dismissed_at` / `accounts.email`.
- UA copy: «Неправильний…» (not «Невірний») for phone/code/credentials errors.

## Files changed

- `migrations/0011_reauth_proofs.sql`, `src/worker/identity/reauth.ts` — reauth
  proof table + issue/consume helpers
- `src/worker/identity/routes.ts`, `routes.test.ts`, `test-support.ts` —
  `/api/auth/reauth`, updated `phone/change` body, AUTH-005 reset contract
- `src/client/pages/ChangePhonePage.tsx` — reauth step + logout/notice redirect
- `src/client/lib/authApi.ts` — `reauth()`, `phoneChange(reauthProof, proof)`
- `src/client/lib/authNotice.ts`, `authNotice.test.ts` — notice param +
  sign-out redirect helpers
- `src/client/pages/LoginPage.tsx`, `ForgotPasswordPage.tsx` — HintPanel notices;
  forgot-password no longer guest-only
- `src/client/App.tsx` — `/forgot-password` unguarded; RequireAuth uses
  `buildRequireAuthLoginRedirect`
- `src/client/hooks/useNavigationBlocker.ts`, `.test.ts`, `useUnsavedDiscard.ts`
  — AUTH-003 BrowserRouter blocker
- `src/client/pages/ProfilePage.tsx`, `NotificationChannelsForm.tsx` —
  AUTH-005 SMS-only Save dismissal
- `src/client/i18n.ts` — credentials wording
- `docs/regression.md` — AUTH-003/004/005 entries
- `docs/plans/auth-registration-plan.md` — reauth + phone/change API notes

## Verification

- `npm test -- --run src/worker/identity/routes.test.ts
  src/client/lib/authNotice.test.ts
  src/client/hooks/useNavigationBlocker.test.ts` — 35 passed

## Pending

- [ ] Manual UI pass: `/change-phone` end-to-end → `/login?notice=phone_changed`
- [ ] Manual UI pass: signed-in `/forgot-password` → reset → `/login?notice=password_changed`
- [ ] Manual UI pass: profile notifications SMS-only Save clears email onboarding
- [ ] KB specs (`identity-auth.md`, `login-implementation.md`) still describe
  password-in-`phone/change` — update when reauth proof model is synced
- [ ] Profile menu IA / matches routes remain uncommitted in working tree

