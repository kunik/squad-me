# Profile aside, theme system, shell polish

**Date:** 2026-07-23 18:40

## Summary

Continued the Gentelella redesign wave: removed the profile aside in-page submenu, fixed scroll-spy for sticky aside and short pages (PROFILE-009/010), stacked mobile Profile layout (order/width/padding) with scrollbar-gap scroll lock (SHELL-001–003, PROFILE-011/012), masked phones in display UI with a Cursor rule, added light/dark/system theme cycling plus AUTO SVG mask, and moved chrome icons to inline SVG (deleted unused PNG icons).

## Key decisions

- Profile aside keeps identity + security cards only — no in-page section submenu; deep links / onboarding still use `#my-profile` / `#my-divisions` / `#my-notifications`.
- Scroll-spy targets those three anchors only; `#profile-actions` is not in the spy set (PROFILE-009).
- Document-end override forces the last section only when the reading line still names the first and last never reached the line (PROFILE-010).
- Mobile Profile (≤1100px, Gentelella `.col-8-4`) uses `display: contents` + flex `order`: avatar → main sections → security; cards stretch full width.
- Drawer scroll lock measures `clientWidth` gap into `--removed-scrollbar-width` so content does not jump when the scrollbar disappears (Safari/overlay-safe).
- Theme preference is three-state (`light` → `dark` → `system`); AUTO glyph is user-supplied `public/icon-theme-auto.svg` via CSS `mask-image`.
- UI phone display uses `maskPhoneE164` everywhere except active tel inputs; rule in `.cursor/rules/phone-display-masking.mdc`.
- Chrome icons are inline SVG; orphaned `icon-edit/cancel/verified.png` removed; rule in `.cursor/rules/ui-icons.mdc`.

## Files changed

- Profile / nav: `ProfileAside.tsx`, `ProfilePage.tsx`, `useProfileScrollSpy.ts`, `profileMenu.ts` (+ tests), `profileNavigation.ts` (+ tests), `i18n.ts`, `linkedShootersDemo.ts`, `maskIdentity.ts`.
- Theme: `theme.ts`, `theme.test.ts`, `useTheme.ts`, `ThemeSwitch.tsx`, `index.html`, `public/icon-theme-auto.svg`.
- Shell / icons: `AccountShell.tsx`, `SidebarFooter.tsx` (+ test), `ProfileSectionHeader.tsx`, `scrollLock.ts` (+ test), `useSidebarScrollLock.ts`; deleted `public/icon-{edit,cancel,verified}.png`.
- Styles: `styles.css` (aside, mobile stack, scrollbar gutter, backdrop, footer rail, theme AUTO).
- Docs / rules: `docs/regression.md` (PROFILE-009–012, SHELL-001–003), `docs/plans/gentelella-fidelity-audit.md`, `.cursor/rules/phone-display-masking.mdc`, `.cursor/rules/ui-icons.mdc`.
- This log.

## Verification

- `npm run typecheck` — pass.
- `npm test` — 198 passed (23 files).

## Pending

- Manual smoke: mobile Profile order/width, drawer open/close (no content jump), theme cycle + OS follow, masked phones in sidebar/notifications, scroll-spy through three sections.
- Remaining Gentelella fidelity backlog items from the audit plan.
