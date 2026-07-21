# 2026-07-22 · Matches routes + profile menu + notifications polish

## Summary

After `3e7e88a` (phone-change / reauth already committed): nested account left nav
under «Мій профіль», separate authenticated routes `/matches` and
`/linked-shooters`, authed `/` → `/matches` (or `/profile` while onboarding), and
AUTH-002 Navigate-loop hardening. Notifications channel rows polished (radios
locked until connected, plug icons with hover swap, masked identifiers, view
mode hides disconnected icons, CSS grid row alignment + divider gap).

## Key decisions

- Top-level rail: **Мої матчі / Пов’язані стрільці / Мій профіль**; only the
  active group expands children (`PROFILE_MENU_GROUPS` + `ProfileSideMenu` +
  `AccountShell`).
- Under «Мій профіль»: **Особисті дані → Дивізіони → Сповіщення → Безпека**.
- Authenticated home is `/matches` (`postAuthLandingPath`); guests keep public
  `/`. Logo for signed-in users → `/matches`.
- AUTH-002: never `<Navigate>` to the current pathname; `safeNextPath` rejects
  `/` and guest auth entry paths; catch-all skips `/` ping-pong for authed users.
  Keep `BrowserRouter` (data-router remount loops were the original hazard).
- Notifications: radios disabled until connected; disconnected status icon opens
  connect panel; `icon-channel-connected` / `icon-channel-disconnected` (hover
  previews connected); view mode hides disconnected plug icons; identifiers via
  `maskIdentity`.

## Files changed

- Routes / shell: `App.tsx`, `AccountShell.tsx`, `ProfileSideMenu.tsx`,
  `MatchesPage.tsx`, `LinkedShootersPage.tsx`, `ProfilePage.tsx`,
  `PublicHeader.tsx`, `RegisterPage.tsx`, `profileMenu.ts` (+ test),
  `authNavigation.test.ts`, `useProfileScrollSpy.ts`, `profileNavigation.ts`
- Notifications UI: `NotificationChannelsForm.tsx`, `ProfileControls.test.ts`,
  `public/icon-channel-*.png`, `styles.css`, `i18n.ts`
- Docs: `docs/regression.md` (AUTH-002 + menu label strings), `docs/testing.md`
- Prior same-topic draft log kept: `2026-07-21-2254-profile-menu-notifications-ia.md`
- This session log

## Verification

- `npm test` (vitest run): 22 files / 191 tests passed

## Pending

- Persist preferred notify channel API; email OTP confirm + Telegram link APIs
- OTP deploy secrets gate still open (see `2026-07-21-2122-…` handoff)
- Fill Matches / Linked Shooters pages beyond placeholders
