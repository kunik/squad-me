# Profile page owns onboarding + editing

## Summary

Unified post-auth profile editing and notification channels on authenticated
`/profile`. Onboarding no longer uses a separate `/onboarding` wizard surface.
**Superseded 2026-07-20:** onboarding is only a `FlowStatus` banner over the
normal `/profile` Edit/Save/Cancel surface (see
`2026-07-20-2026-profile-banner-onboarding.md`).

## Key decisions

- `/profile` is the single surface for profile form, read-only profile data
  (same block layout as the edit form), and email notification channels.
- `onboardingStep` non-null → same page + top banner (hint + Skip); `null` →
  same page, no banner. Forms are not layout-branched for onboarding.
- Banner Skip calls dismiss API, refreshes `/me`, does not navigate away.
- Legacy `/onboarding` and `/complete-profile` redirect to `/profile`.
- `OnboardingGuard` redirects pending onboarding to `/profile`.
- Mini-menu: Налаштування / Мої матчі (placeholder).

## Files changed

- `src/client/pages/ProfilePage.tsx` (new)
- `src/client/components/ProfileSummary.tsx` (new; form-mirrored read-only)
- `src/client/components/EmailChannelsForm.tsx` (section mode, optional Skip)
- `src/client/App.tsx` (route + guard → `/profile`)
- `src/client/components/PublicHeader.tsx` (Профіль → `/profile`)
- `src/client/pages/RegisterPage.tsx`, `LoginPage.tsx` (navigate `/profile`)
- Deleted `src/client/pages/OnboardingPage.tsx`
- `src/client/i18n.ts`, `src/client/styles.css`
- `docs/plans/auth-registration-plan.md`

## Verification

- `npm run typecheck` — pass
- `npm test` — 7 files, 80 tests pass

## Pending

- Real match list for «Мої матчі»
- Telegram / Web Push beyond email UI
