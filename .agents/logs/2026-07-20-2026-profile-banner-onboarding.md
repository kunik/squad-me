# Profile onboarding = banner over normal `/profile`

## Summary

Confirmed and documented the product rule that post-auth onboarding does **not**
get a special profile/notifications UI. Pending `onboardingStep` only overlays
the shared `FlowStatus` hint-bar (hint + Skip) on the ordinary `/profile`
management surface.

## Already in the tree (prior sessions)

- `/profile` sectional Edit/Save/Cancel for identity and divisions
- Sibling anchors `#my-profile`, `#my-divisions`, `#my-notifications`,
  `#profile-actions` with sticky-header scroll-spy; `scrollY = 0` forces
  «Мій профіль» even on short pages that are also at document end
- `FlowStatus` optional action button; profile page wires Skip →
  profile-prompt / email-prompt dismiss
- `EmailChannelsForm` has no onboarding-only Skip footer
- Account-deletion in-app modal, register-as-reset nickname safety (`AUTH-001`),
  Turnstile wiring, OnboardingGuard → `/profile`

## Finished this session

- Auth plan rewritten for banner-overlay onboarding (no form-layout branching;
  divisions ARE an onboarding step between profile and email — see
  `.agents/logs/2026-07-21-0143-disciplines-onboarding.md`)
- Removed unused `commChannelsSkip` i18n keys (Skip lives on `profileSkip` /
  `FlowStatus` only)
- `docs/testing.md` lists client FlowStatus / ProfileControls / scroll-spy
  contracts

## Verification

- `npm run typecheck` — pass (fixed `tsconfig.test.json` to exclude
  `src/client/**` so Workers test config does not typecheck JSX imports)
- `npm test` — pass, 10 files / 105 tests
- `npm run build` — pass

## Pending

- Real match list for «Мої матчі» / linked shooters
- Telegram / Web Push beyond email UI
