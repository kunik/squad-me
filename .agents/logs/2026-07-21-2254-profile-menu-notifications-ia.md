# 2026-07-21 · Profile menu IA + notifications polish

## Summary

Uncommitted follow-on after `194d8e2` / `6ae816d`: finished «Сповіщення» channel UX
(radio preference vs connect status, plug icons with hover swap, masking), nested
the profile left nav under «Мій профіль» with accordion expand, and shipped
authenticated `/change-phone` with step-up (full current phone + password before
consuming new-phone OTP proof). Docs/regression/i18n/CSS/tests updated to match
renamed menu labels.

## Key decisions

- Left nav: top-level **Мої матчі / Пов’язані стрільці / Мій профіль**; only the
  active group’s children expand (`PROFILE_MENU_GROUPS` + `ProfileSideMenu`).
- Under «Мій профіль»: **Особисті дані → Дивізіони → Сповіщення → Безпека**
  (was flat «Мій профіль / Мої дивізіони / Мої сповіщення / Дії…»).
- Notifications: radios disabled until connected; disconnected status icon expands
  connect panel; icons `icon-channel-connected` /
  `icon-channel-disconnected` (hover previews connected on disconnected).
- Phone/email identifiers shown masked (`maskIdentity`); change-phone UI shows
  masked current number but API requires full current E.164 + password.
- `POST /api/auth/phone/change`: require `currentPhone` + `password` +
  `proofToken`; wrong identity must not burn the OTP proof.
- Onboarding hint for notifications: connect a channel first, then choose
  preference.

## Files changed

- Menu: `profileMenu.ts` (+ test), `ProfileSideMenu.tsx`, `ProfilePage.tsx`,
  scroll-spy / navigation label updates, `styles.css`, `i18n.ts`
- Notifications: `NotificationChannelsForm.tsx`, `ProfileControls.test.ts`,
  `public/icon-channel-*.png`, masking via `maskIdentity.ts` (+ test)
- Phone change: `ChangePhonePage.tsx`, `App.tsx` route + auth guard,
  `authApi.ts`, `identity/routes.ts` (+ tests)
- Docs: `docs/regression.md` (menu label strings), `docs/testing.md`,
  `docs/plans/auth-registration-plan.md`
- This session log

## Verification

- New/updated unit coverage: `profileMenu.test.ts`, `maskIdentity.test.ts`,
  `ProfileControls.test.ts`, `identity/routes.test.ts` (phone-change step-up)
- Full `npm test` not re-run in this logging pass (last green suite was on
  `194d8e2`: 17 files / 158 tests)

## Pending

- Persist preferred notify channel API; email OTP confirm + Telegram link APIs
- Commit this working tree when asked
- OTP deploy secrets gate still open (see `2026-07-21-2122-…` handoff)
