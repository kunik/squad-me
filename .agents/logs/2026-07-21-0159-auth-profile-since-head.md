# Auth / profile session since HEAD

**Date:** 2026-07-21 01:59
**Repo:** squad-me
**Base:** `8ed2f80` — Replace public square-grid drift with a slow honeycomb breathe
**Status:** implemented (uncommitted); prior slice logs under `.agents/logs/2026-07-18*` … `2026-07-21-0143*`

## Summary

Long uncommitted session since HEAD delivered the full auth/registration stack,
server-driven post-auth onboarding on `/profile`, sectional profile/disciplines
editing, account deletion, and public-chrome polish. Incremental topic logs
already exist; this entry is the handoff across the whole working tree.

**Auth / registration.** Phone → OTP → password(+nickname) wizards on
`/register` and `/forgot-password`; opaque-cookie sessions; D1 OTP + rate
limits; pluggable Turnstile (noop when unset); register-as-reset discloses
`accountMode` only after OTP and uses `section: "nickname"` so reset does not
wipe profile (`AUTH-001`). OTP proof lives in `sessionStorage`
(`otpProofStorage`). Network failures no longer silently clear session/profile;
register progress/guidance uses sticky `HintPanel` («панель підказки»).

**Profile / onboarding.** `/profile` is the single management surface.
`GET /api/auth/me` → `onboardingStep: "profile" | "disciplines" | "email" | null`
drives a HintPanel overlay (hint + Skip) over the normal Edit/Save/Cancel UI —
no separate onboarding layout. Order: profile → disciplines → email. Skip via
menu-nav-safe dismiss APIs; auto-edit + scroll to the relevant section on step
advance. Identity and divisions save independently (`section` merges).
Scroll-spy / sticky chrome / hex-atmosphere regressions: `PROFILE-001`–`005`.

**Account deletion.** `DELETE /api/auth/account` tombstones Account/Profile,
erases live PII, preserves registration FKs; in-app `AppDialog` with typed
`ВИДАЛИТИ` / `DELETE`. Unsaved dirty edits also use `AppDialog` (not native
`confirm`).

**UI.** Static hex atmosphere + translucent panels; fixed `PublicChrome` top
chrome (header + HintPanel slot); responsive logo; min-width 320; edit icon
asset; discipline select styling; default avatar.

**Migrations.** `0002`–`0010` (identity, profile, club, optional name, profile /
email / disciplines prompt dismissal, disciplines columns, account deletion).

**Docs.** Plan, provision secrets, testing contracts, regression `AUTH-001` +
`PROFILE-001`–`005`; KB user-profile / notes / principles synced in prior
slices (not re-logged here).

## Key decisions

- Server-owned `onboardingStep` (not RegisterPage wizard state) so refresh
  converges; onboarding is HintPanel-over-normal-`/profile`, not a second form.
- Disciplines are an onboarding step between profile and email (revises earlier
  “divisions never onboarding”).
- Register-purpose OTP remains password-reset authority; nickname bootstrap is
  sectional so existing profile fields / `profile_completed_at` survive.
- Account rows are tombstoned, not hard-deleted, to keep registration FKs.
- Atmosphere wash/hex sit outside `.public-surface` so expanders/scroll do not
  re-center the grid (`PROFILE-005`); window scroll only.
- Shared sticky HintPanel hosts register progress and profile onboarding Skip.

## Files changed

Grouped (full tree still uncommitted vs `8ed2f80`):

- **Migrations:** `0002_identity` … `0010_disciplines_prompt_dismissal`
- **Worker:** `src/worker/identity/**` (password, session, phone, OTP, Turnstile,
  profile, disciplines, rate-limit, routes + tests), `env.ts`, `index.ts`
- **Client auth:** `auth.tsx`, `lib/authApi|authErrors|otpProofStorage`,
  `RegisterPage`, `ForgotPasswordPage`, Login/Home/App/main wiring
- **Client profile:** `ProfilePage`, `ProfileForm`, `ProfileSummary`,
  `EmailChannelsForm`, `lib/profileNavigation|disciplines|regions`,
  `HintPanel`, `AppDialog`, `PublicChrome`, header/atmosphere updates
- **Assets / styles / i18n:** `public/avatar-default.png`, `icon-edit.png`,
  large `styles.css` + `i18n.ts` delta
- **Docs / notes:** `docs/plans/auth-registration-plan.md`, `provision.md`,
  `testing.md`, `regression.md`, `docs/README.md`, `.agents/notes.md`,
  `.dev.vars.example`, package/vitest/tsconfig.test tweaks
- **Prior slice logs:** `.agents/logs/2026-07-18-2152` … `2026-07-21-0143-*`

## Verification

Latest recorded gate (banner-onboarding / disciplines slices):

- `npm run typecheck` — pass (`tsconfig.test.json` excludes `src/client/**`)
- `npm test` — pass (~10 files / ~105 tests; earlier slices reported lower counts)
- `npm run build` — pass
- Local migrations applied through `0010` in those sessions
- Regression contracts: `AUTH-001`, `PROFILE-001`–`005` in `docs/regression.md`
  with unit coverage under identity routes, `profileNavigation`, atmosphere

## Pending

- Commit this working tree (not done; user must ask)
- Phase 0 secrets: real Telegram Gateway / Twilio / Turnstile for non-local
- Legal retention basis for tombstoned registration/payment evidence
- Real «Мої матчі» / linked shooters; Telegram / Web Push beyond email UI
- Match registration consuming saved disciplines

---

## Delta since 01:59 (2026-07-21 ~02:18)

Profile form polish on the same uncommitted tree (still vs `8ed2f80`). No KB changes.

### Summary

- **Discipline `<select>` chrome.** Native UA styling (opaque fill + thick accent while `:invalid` on empty required division) reset via `select.auth-form__input`: `appearance: none`, translucent `--panel-bg`, custom chevron, error border only on `:user-invalid`.
- **Custom birth-date picker.** Replaced native `type="date"` with `DateField` + `lib/dateField` helpers: panel-chrome trigger, `DD.MM.YYYY` / locale display, popover month grid (Monday-first), month/year selects, prev/next, `max` defaults to today, Escape/outside click close. No native date input in markup.
- **Calendar icon.** New `public/icon-calendar.png` on the DateField trigger (SquadMe icon style).
- **i18n / wiring.** UA/EN `dateField*` strings; `ProfileForm` uses `DateField`.

### Files changed (delta)

- `public/icon-calendar.png` (new)
- `src/client/components/DateField.tsx` + `DateField.test.ts` (new)
- `src/client/lib/dateField.ts` + `dateField.test.ts` (new)
- `src/client/components/ProfileForm.tsx` (DateField for birth date)
- `src/client/styles.css` (`select.auth-form__input` + `.date-field*` block)
- `src/client/i18n.ts` (`dateFieldPlaceholder` / calendar / month-year labels)

### Verification

- Unit coverage added: `DateField` SSR markup (trigger chrome, icon, placeholder, no `type="date"`); `dateField` helpers (parse/format, Monday-first grid, compare/shift, local today).
- Full `npm test` / typecheck / build not re-run in this compress pass.

### Pending (unchanged)

- Commit still not requested for the full tree; Phase 0 secrets / legal retention / matches consumers as above.

---

## Delta since ~02:18 (2026-07-21 14:01)

Avatar chrome polish on the same uncommitted tree. Decisions also in
`.agents/logs/2026-07-21-1401-avatar-frame-polish.md` + KB user-menu /
user-profile notes.

### Summary

- Profile avatar: diagonal `--avatar-frame` gradient ring (accent TL → muted BR).
- Header avatar: thin `--panel-border` like content panels (not gradient).
- User-menu trigger: square `2.75rem` circle so hover wash is not a tall oval.

### Files changed (delta)

- `src/client/styles.css` (avatar tokens + profile/user-menu avatar + trigger)
- `.agents/notes.md` (avatar chrome note)
- `.agents/logs/2026-07-21-1401-avatar-frame-polish.md`

### Pending

- Full working-tree commit still open unless user asks for the whole WIP.
