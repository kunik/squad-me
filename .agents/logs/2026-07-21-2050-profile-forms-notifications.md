# 2026-07-21 · Profile forms polish & notifications rebuild

## Summary

Committed `/profile` form polish and a rebuilt «Мої сповіщення» section on top of
the identity/auth + profile onboarding stack. Profile edit UX: stable section
headers, edit/cancel icon controls, FieldHints (purpose + italic validation),
live validation, nickname/membership rules, UA→EN transliteration, gender/IPSC
defaults, red invalid highlight, and membership info-notes only during
onboarding. Notifications: channel toggles with verified icon, save/cancel, copy.
Fixed PROFILE-007 chrome `pointer-events` so HintPanel gutters no longer block
Edit. Touched `docs/regression.md` and `docs/plans/auth-registration-plan.md`.
Obsidian KB updated outside the repo for verification / channel decisions.

## Key decisions

- FieldHint shows purpose text plus italic validation guidance; invalid fields
  use red highlight; live validation while editing.
- Nickname and membership field rules enforced client + shared validation;
  UA names can transliterate to EN; gender and IPSC membership defaults applied
  on enable/empty.
- Membership info-notes only in onboarding (not everyday edit).
- «Мої сповіщення»: Email / Telegram Bot / SMS toggle blocks; SMS shows
  auth-verified phone + verified badge without re-OTP; email/Telegram verify
  flows remain stubbed where backends are missing.
- PROFILE-007: `.app-top-chrome` uses `pointer-events: none` with interactive
  children re-enabled so Edit under the hint is clickable.

## Files changed

- Profile UI: `ProfileForm*` / `ProfileDetailsForm` / `FieldHint` / `DateField` /
  icons (`icon-edit`, `icon-cancel`, `icon-verified`), styles, i18n, validation +
  `transliterateUa`
- Notifications: `NotificationChannelsForm` / `EmailChannelsForm`, profile page
  wiring
- Chrome: `PublicChrome` / HintPanel pointer-events (PROFILE-007)
- Docs: `docs/regression.md`, `docs/plans/auth-registration-plan.md`, related
  testing/provision notes; identity worker + migrations in the same tree
- KB (outside repo): notifications / user-profile verification decisions

## Verification

- `npm test` — 17 files, 157 tests passed

## Pending

- Rework notifications form (next session — not started here)
