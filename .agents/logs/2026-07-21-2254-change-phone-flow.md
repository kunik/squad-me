# 2026-07-21 · Change phone number (secure flow + UI)

## Summary

Added profile «Змінити номер телефону» (`/change-phone`): confirm full current
phone (UI elsewhere masked) + password via `login`, then OTP on the **new**
number, then `POST /api/auth/phone/change`. No OTP to the old number so lost
handset still works with a live session. Offline recovery without session stays
parked (verified email later).

## Key decisions

- Step-up: full current phone + password before new-phone OTP (not OTP to old).
- `phone/change` body: `currentPhone` + `password` + `proofToken`; identity
  checked **before** consuming proof (failed step-up does not burn OTP).
- Confirm step verifies immediately with `POST /api/auth/login`, after client
  check that typed phone matches the session account (avoids switching accounts).
- Verified credentials kept in refs for the final `phone/change` call.
- UA copy: «Неправильний номер…» (not «Невірний») for phone/credentials errors.

## Files changed

- `src/worker/identity/routes.ts` + `routes.test.ts` — phone/change step-up
- `src/client/pages/ChangePhonePage.tsx` — wizard (new)
- `src/client/App.tsx` — `/change-phone` + onboarding exempt
- `src/client/pages/ProfilePage.tsx` — Security action link
- `src/client/lib/authApi.ts` — `phoneChange(proof, currentPhone, password)`
- `src/client/i18n.ts` — change-phone strings + credentials wording
- `docs/plans/auth-registration-plan.md` — API/UI notes

## Verification

- `npm test -- --run src/worker/identity/routes.test.ts` — 26 passed

## Pending

- [ ] Manual UI pass of `/change-phone` after early-login verify fix
- [ ] Phone-loss recovery without session (verified email) — parked
- [ ] Commit when requested (working tree also has unrelated profile/menu diffs)
