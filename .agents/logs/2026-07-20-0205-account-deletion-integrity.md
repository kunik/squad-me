# Account deletion with registration integrity

## Summary

Implemented authenticated full account/profile deletion from Profile Actions.
Live auth/contact/profile PII is erased or pseudonymized atomically while opaque
Account/Profile tombstones preserve current and future registration foreign keys.

## Key decisions

- `DELETE /api/auth/account` requires the current session and existing
  same-origin protection; success clears the cookie and invalidates all sessions.
- Account/Profile rows are tombstoned rather than hard-deleted because canonical
  registrations retain `profile_id` and may retain account actor/creator FKs.
- Submitted registration snapshots, status, match/squad/payment/result links are
  never updated by deletion.
- The original phone is released for a fresh Account; old registrations are not
  automatically relinked.
- UI uses an accessible in-app dark modal (no native browser dialogs), requires
  typing `ВИДАЛИТИ` / `DELETE`, and explicitly explains that match registrations
  remain.

## Files changed

- `migrations/0009_account_deletion.sql` — tombstone columns and defensive
  nullable Profile account FK with `ON DELETE SET NULL`.
- `src/worker/identity/routes.ts` — atomic deletion endpoint and live-account
  filtering.
- `src/worker/identity/session.ts` — rejects tombstoned accounts.
- `src/worker/identity/test-support.ts` — current schema plus FK registration
  preservation fixture.
- `src/worker/identity/routes.test.ts` — deletion, PII/auth cleanup, registration
  preservation, stale session, origin/auth rejection, and same-phone re-register.
- `src/client/lib/authApi.ts` — account deletion client.
- `src/client/pages/ProfilePage.tsx` — accessible modal with initial focus,
  Escape/backdrop safety, focus containment/restore, typed confirmation,
  in-modal error/progress state, auth/OTP cleanup, and success redirect.
- `src/client/i18n.ts` — localized destructive-confirmation and success copy.
- `src/client/styles.css` — dark responsive modal/backdrop and mobile-safe
  action layout.
- `docs/plans/auth-registration-plan.md` — endpoint, schema, retention semantics.
- `docs/testing.md` — deletion contract coverage and current test schema.

## Verification

- `npm run migrations:local` — passed; `0009_account_deletion.sql` applied.
- `npm run typecheck` — passed.
- `npm test` — passed, 94 tests in 7 files.
- `npm run build` — passed.
- Changed-file IDE lints — no errors.
- `git diff --check` — passed.

## Pending

- Define legal basis and retention periods for registration snapshots, payments,
  results, domain events, and related evidence before external beta.
