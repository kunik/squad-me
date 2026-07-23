# Registration wizard: minimal shooter Profile + deferred email step

**Date:** 2026-07-19 00:26

## Summary

Added a new `Profile` entity (separate from `Account`, 1:1 via `account_id`)
and a deferred email-collection step to the existing phone+password
registration wizard. The wizard is now: phone → OTP → **profile data** →
password → account created → **comm channels (email)** → done. New
`migrations/0003_profile.sql` adds the `profiles` table and
`accounts.email` (nullable, partial-unique). Three new endpoints
(`POST`/`GET /api/profile`, `POST /api/auth/account/email`) reuse the
existing `squad_session` cookie auth. Frontend: `RegisterPage.tsx` holds
profile-step values in React state until the account exists (since
`/api/profile` requires auth), then fires the upsert right after a
successful `register`, with an inline retry (no OTP repeat, no wizard
restart) if that follow-up call fails.

**Product decision provenance:** this scope came from a product
conversation recorded in the Obsidian knowledge base — `login-implementation.md`
§ "Додано 2026-07-18 — мінімальний Profile при реєстрації", `user-profile.md`
(field captions), `notifications.md` (email as an accepted notify channel) —
written by the parent conversation, not by this worker. This worker had no
Obsidian access; all field/copy specifics came transcribed in the task prompt.

## Key decisions

- **Sequencing (auth-before-profile):** `/api/profile` requires a session,
  which doesn't exist until after `register`. The profile step therefore
  only holds values in memory (same pattern as the existing phone/OTP-proof
  carry-over between wizard steps) and fires the upsert as the first thing
  after a successful `register` + `refresh()`. A dedicated `profileSave`
  wizard step runs this automatically and shows a retry button (not the
  password form) if it fails, since the account/session already exist —
  restarting OTP would be wrong.
- **Atomic upsert, not check-then-insert:** `POST /api/profile` always binds
  a fresh `crypto.randomUUID()` as `id` and relies on
  `INSERT ... ON CONFLICT(account_id) DO UPDATE SET ...` (with `id` omitted
  from the `SET` list) so a second concurrent/retry call can never race a
  read-then-write — the same atomic-insert spirit as `accounts.phone_e164`
  in the register route. A post-upsert `SELECT` is only used to return the
  current row to the caller.
- **`accounts.email` conflict handling:** a plain `UPDATE ... WHERE id = ?`
  is enough — SQLite enforces the partial `UNIQUE` index on `UPDATE` too, so
  a duplicate-email conflict surfaces as a constraint error with no
  check-then-update race, mapped to the same generic `409` / no-enumeration
  style as the existing register-phone-conflict path.
- **Email is not verification-gated in v1** — deliberately, per the product
  decision. `POST /api/auth/account/email` does a simple regex + length-cap
  shape check and writes straight to `accounts.email`. No verification
  email, no token, no expiry.
- **Validation lives in a dedicated `src/worker/identity/profile.ts` module**
  (mirrors the `password.ts` / `phone.ts` pattern): throws
  `ProfileValidationError` with a `field` property; routes.ts catches it and
  returns `400` with `{ error: "invalid_profile", field }`. Client mirrors
  the same Cyrillic/Latin/control-char regexes for immediate UX feedback,
  but the server check is authoritative.
- **`ipscRegion` default:** per the plan, an `ipscMember` checkbox left
  checked with a blank region defaults server-side to `"UA"` — implemented
  in `normalizeProfileInput`, not in the client, so the default holds even
  for direct API callers.
- **UPSF region list stays in Ukrainian in both locales** — oblast names are
  administrative proper nouns, not UI chrome; no English transliteration was
  fabricated (see Deferred/simplified below).
- **Test flakiness fix (`vitest.config.ts` `testTimeout: 20_000`):** the
  pre-existing `identity/routes.test.ts` file already ran several
  scrypt-heavy registers/logins per test; adding 4 more profile/email tests
  (2 more registers each) pushed some pre-existing tests over vitest's 5s
  default timeout under this sandbox's variable CPU load — confirmed via
  repeated isolated runs (same tests flipped pass/fail with no code changes
  between runs). Raised the global timeout rather than special-casing
  individual tests; real hangs still fail well before a human would notice.

## Files changed

Backend (new):
- `migrations/0003_profile.sql` — `profiles` table + `accounts.email` + partial unique index
- `src/worker/identity/profile.ts` — validation/normalization + row/view types
- `src/worker/identity/profile.test.ts` — pure unit tests for validation/birth-date logic

Backend (modified):
- `src/worker/identity/routes.ts` — `handleProfileGet`, `handleProfileUpsert`, `handleAccountEmail`; `AccountRow`/`accountView` now include `email`
- `src/worker/identity/routes.test.ts` — added profile upsert (create/update/no-duplicate), profile auth-required, profile validation, and account-email (happy path/invalid shape/duplicate 409/unauthenticated) tests
- `src/worker/identity/session.ts` — `AccountRow` type gets `email: string | null`
- `src/worker/identity/test-support.ts` — schema bootstrap adds `profiles` table + `accounts.email` column + unique index; `RESET_STATEMENTS` adds `DELETE FROM profiles` (before `accounts`, FK order)
- `src/worker/index.ts` — routing guard now also matches `/api/profile` (previously only `/api/auth/*`)
- `vitest.config.ts` — `testTimeout: 20_000` (see decisions above)

Frontend (new):
- none (all frontend changes were to existing files)

Frontend (modified):
- `src/client/pages/RegisterPage.tsx` — new `profile`, `profileSave`, `commChannels` wizard steps; held profile-step state; client-side Cyrillic/Latin/control-char mirrors of server validation; UPSF region `<select>`; collapsible `<details>` blocks for ФПСУ/IPSC optional fields
- `src/client/lib/authApi.ts` — `getProfile`, `upsertProfile`, `setAccountEmail`; `ProfileInput`/`ProfileView`/`Gender` types; `AccountView` gains `email`
- `src/client/lib/authErrors.ts` — maps `invalid_profile` / `invalid_email` / `email_already_used`
- `src/client/i18n.ts` — new UA/EN strings for the profile step, comm-channels step, and the three new error codes
- `src/client/styles.css` — `.profile-form__*` rules (name blocks, radio group, checkbox rows, `<details>` sections, retry screen) reusing existing `--space-*`/`--radius-*`/`--color-*` tokens and the existing `.auth-form__*` primitives (select reuses `.auth-form__input`)

Docs:
- `docs/plans/auth-registration-plan.md` — status line + new "Profile при реєстрації (додано 2026-07-18)" section (wizard shape, field table, new endpoints, explicit out-of-scope list)
- `docs/testing.md` — schema-bootstrap note now mentions `0003_profile.sql`; "Flaky tests" section documents the `testTimeout` change

## Verification

- `npm run typecheck` — pass (all 3 tsc projects)
- `npm run build` — pass (worker bundle + client bundle)
- `npm test` — pass, 66/66 across 7 files, run twice consecutively to confirm stability after the `testTimeout` fix (previously flaky — see decisions)
- `npm run migrations:local` — pass; `0003_profile.sql` applied cleanly on top of `0001`/`0002` on the top-level local D1 (5 statements executed: `schema_meta` upsert, `ALTER TABLE accounts ADD COLUMN email`, unique index, `CREATE TABLE profiles`)
- UI smoke test: not attempted (same sandbox network-isolation limitation noted in the prior session's log); relying on `typecheck`/`build` catching JSX/type errors, per that log's stated fallback.

## Deferred / simplified versus the task spec

- **Region/oblast validation is length-capped only, not enum-checked
  server-side.** The dropdown constrains the UI, but `POST /api/profile`
  accepts any string ≤100 chars for `region` (same free-text treatment as
  `city`) rather than validating against the 27-item UPSF list. Low risk
  (display-only field today), but worth tightening if `region` ever drives
  logic (e.g. regional match eligibility).
- **UPSF region names are not transliterated into English** for the `en`
  locale — they render in Ukrainian in both languages, since the task only
  supplied the Ukrainian list and these are administrative proper nouns.
- **Client-side `birthDate` validation is a lightweight non-future check
  only**; the full "age ≤ 120 years" plausibility bound is enforced
  server-side (`isValidBirthDate` in `profile.ts`) and surfaces as a generic
  `invalid_profile` error if violated, rather than being duplicated
  client-side with an exact age-boundary message.
- **`AccountView`/`accountView()` now exposes `email`** even though the task
  didn't explicitly ask for it — a natural, low-risk consequence of adding
  `accounts.email`, useful for a future profile page / to let the UI know an
  email is already on file. Flagging in case the parent wants it scoped out.
- **`GET /api/profile` is implemented but not yet consumed by any UI**
  beyond the registration wizard's own held-state flow (the wizard never
  calls `GET`, since it holds values locally) — it exists per the spec for
  reuse by a future profile page, but that page doesn't exist yet.
- Everything explicitly out of scope in the task (division/power_factor,
  upsf_rank/ipsc_class, club/selected_club_id, email verification, Telegram
  Bot linking, Web Push) was left untouched, as instructed.

## Pending

- Everything already pending from the prior auth-registration session
  (Phase 0 manual secrets/accounts, scrypt CPU benchmark, live Turnstile
  enforcement, browser-based UI smoke test) is still pending — unchanged by
  this task.
- Region enum validation (see Deferred above) if `region` starts driving
  server-side logic.
- Nothing was committed — all changes are staged/unstaged in the working
  tree per instructions; branch `feature/bootstrap-basic-site` unchanged.

## Follow-up (corrected) — 2026-07-19, ~00:39

**Two follow-up requests landed in quick succession on top of the pass
above.** The first ("add `club`, relax the NOT NULL / at-least-one-name-set
rule, add a data-completeness `needsProfile` guard") was **superseded
mid-flight** by a second, corrected spec before it was fully verified — the
product decision on *how* to guard incomplete profiles changed from
"infer completeness from column nullability" to "an explicit dismissal
flag + an explicit completed-at flag". This section documents the final,
corrected state actually implemented; the superseded direction is not
described further below except where its work product was kept as-is.

**What was kept unchanged from the superseded attempt:**
- `club` (temporary free-text placeholder on `profiles`, no `Club` entity
  yet) — field, validation, migration, UI, i18n, tests.
- `first_name_ua` / `last_name_ua` nullable in `profiles` — still correct
  and wanted under the corrected design too (nickname alone is enough
  identity now).
- The `ProfileForm.tsx` extraction (shared between the wizard and a
  standalone route) and the `/complete-profile` page — both still needed,
  just rewired to the new guard signal.

**What changed (superseded → corrected):**
- Cross-field "at least one of UA name / EN name / nickname must be fully
  present" `400` validation in `POST /api/profile` → **removed entirely**.
  `nickname` moved to the password step (see below) and already guarantees
  *some* identity; the fuller profile step must be zero-validation
  skippable.
- `gender`/`birthDate` unconditionally `NOT NULL` (unaffected by the first
  follow-up) → **made nullable**, with a new pairing rule: normalizer
  rejects one being present without the other, but both being *absent* is
  valid (this is what lets the password step's nickname-only upsert reuse
  the same `POST /api/profile` endpoint without tripping a "profile
  incomplete" error).
- Data-completeness-inferred `needsProfile` (computed by re-checking
  name-field nullability on every `GET /api/auth/me`) → **explicit
  dismissal-flag design**: `accounts.profile_prompt_dismissed_at` (set by
  a new dedicated endpoint) + `profiles.profile_completed_at` (set by
  `POST /api/profile` only on a "real" save, i.e. `gender`+`birthDate`
  both present) → `showProfilePrompt = dismissed_at IS NULL AND
  completed_at IS NULL`.
- Wizard step order: `phone → OTP → profile (before password) → password →
  profileSave → commChannels → done` → **`phone → OTP → password (+
  required nickname) → savingNickname (auto, retry) → profile (optional,
  Save/Skip) → commChannels → done`**.

**Final wizard step list:** `phone` → `otp` → `password` (now also collects
`nickname`, required) → `savingNickname` (automatic, retry-on-failure —
persists just the nickname via `POST /api/profile`) → `profile` (optional
fuller profile form; explicit "Зберегти" or "Пропустити", no silent
auto-advance) → `commChannels` (unchanged) → `done`.

**New/changed endpoints:**
- `POST /api/profile` — same route, contract loosened: every field is now
  optional at the type level except the `gender`+`birthDate` pairing rule
  above; sets `profiles.profile_completed_at` only on a real (both-present)
  save, and never clears an already-set value on a later partial upsert.
- `POST /api/auth/account/profile-prompt/dismiss` — **new**, auth-required,
  idempotent; sets `accounts.profile_prompt_dismissed_at`.
- `GET /api/auth/me` — response field renamed `needsProfile` →
  `showProfilePrompt`, now computed from the two flags above instead of
  re-deriving name-completeness from `profiles` columns on every call.

**Migration file(s) touched:** `migrations/0004_profile_club.sql`
(unchanged, club addition); `migrations/0005_profile_name_optional.sql`
(rewritten in place — was not yet applied anywhere, so no new migration
number was needed — now also drops `NOT NULL`/`CHECK` from `gender` and
`birth_date`, and adds `profiles.profile_completed_at`);
`migrations/0006_profile_prompt_dismissal.sql` (**new**, adds
`accounts.profile_prompt_dismissed_at`).

**Redirect route:** unchanged, `/complete-profile` — still exempt from its
own guard, still reuses `ProfileForm`, now also passes an `onSkip` wired to
the dismiss endpoint (so Skip is available there too, not just inside the
wizard).

**Client-side renames:** `useAuth().needsProfile` → `showProfilePrompt`
(`auth.tsx`, `App.tsx`'s `ProfileCompletionGuard`); `authApi.ts`'s
`MeResponse.needsProfile` → `showProfilePrompt`, plus a new
`dismissProfilePrompt()` call; `ProfileInput.gender`/`birthDate` loosened
from required to optional so the nickname-only call type-checks.
`ProfileForm` gained `onSkip`/`skipLabel`/`skipping` props and dropped its
client-side name-completeness check + the now-removed
`profileNameRequiredHint` copy.

**Dropped as dead code (no longer referenced anywhere, tests included):**
`hasCompleteNameSet`, `isProfileNameComplete`, `ProfileNameFields` (all in
`profile.ts`/`routes.ts`); the `profile_name_incomplete` error code and its
`authErrorProfileNameIncomplete` / `profileNameRequiredHint` i18n strings.

**Files touched in this corrected pass** (on top of the original pass's
file list above): `migrations/0005_profile_name_optional.sql` (rewritten),
`migrations/0006_profile_prompt_dismissal.sql` (new),
`src/worker/identity/profile.ts`, `src/worker/identity/profile.test.ts`,
`src/worker/identity/routes.ts`, `src/worker/identity/routes.test.ts`,
`src/worker/identity/session.ts`, `src/worker/identity/test-support.ts`,
`src/client/lib/authApi.ts`, `src/client/auth.tsx`, `src/client/App.tsx`,
`src/client/components/ProfileForm.tsx`, `src/client/pages/RegisterPage.tsx`,
`src/client/pages/CompleteProfilePage.tsx`, `src/client/i18n.ts`,
`src/client/lib/authErrors.ts`, `docs/plans/auth-registration-plan.md`.
(`src/client/lib/regions.ts` — the UPSF region list extracted during the
superseded pass — is also kept, still consumed by `ProfileForm.tsx`.)

**Verification:**
- `npm run typecheck` — pass (all 3 tsc projects)
- `npm run build` — pass (worker bundle + client bundle)
- `npm test` — pass, **79/79** across 7 files
- `npm run migrations:local` — pass; `0004`/`0005`/`0006` applied cleanly on
  top of `0001`–`0003` on the local D1 (confirmed final `profiles`/`accounts`
  `CREATE TABLE` SQL via `wrangler d1 execute --local`: `gender`/`birth_date`
  nullable with a null-tolerant `CHECK`, `profile_completed_at` present on
  `profiles`, `profile_prompt_dismissed_at` present on `accounts`)

**Not covered by an automated test:** "nickname required at step 3" is
enforced client-side only (`RegisterPage.tsx`'s `required` attribute +
trim/control-char check before calling `register`) — `POST /api/profile`
itself has no per-field required list beyond the `gender`+`birthDate`
pairing, by design (it must accept the nickname-only call unconditionally),
so there's no server-side "missing nickname" `400` to assert against. The
worker test suite instead asserts the actual call shape the wizard sends
(`nickname`-only upsert) succeeds and produces the expected `null`
`gender`/`birthDate`/`profileCompletedAt`.
