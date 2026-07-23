# Gentelella redesign — shell, palette, default avatar

**Date:** 2026-07-23 13:14

## Summary

Rebuilt the authenticated and public client chrome on Gentelella v4 layout patterns (sidebar + page shell, auth layout, UI primitives), mapped Squad Me’s approved brand palette into Gentelella token slots, and replaced the default profile avatar with a transparent PNG from the KB (JPEG-with-black-bg → RGBA).

## Key decisions

- Gentelella is layout/chrome reference only — brand colors stay Squad Me (Black `#050609`, Carbon `#1D2020`, Pumpkin `#E8823C`, Floral White `#FEF8EC`, Carmine, Blue Energy).
- PublicAtmosphere / PublicChrome / PublicHeader removed; AuthLayout + AccountShell + SidebarFooter replace them.
- Default avatar: transparent 1024×1024 PNG (`public/avatar-default.png`); sidebar avatar chrome uses transparent background so the asset alpha shows through.
- Matches / Linked Shooters stay top-level routes with demo data; profile aside uses `UserAvatar`.

## Files changed

- Shell / pages: `AccountShell.tsx`, `AuthLayout.tsx`, `SidebarFooter.tsx`, `ProfileAside.tsx`, `ProfileSideMenu.tsx`, auth + profile + matches + linked-shooters pages; deleted PublicAtmosphere/PublicChrome/PublicHeader.
- Primitives / hooks: `components/ui/*`, `UserAvatar.tsx`, `LangSwitch.tsx`, `ThemeSwitch.tsx`, `useTheme.ts`, `useLogout.ts`, `lib/theme.ts`, `lib/avatar.ts`, `lib/sidebarRail.ts`, demo data libs.
- Styles: `gentelella.css`, rewritten brand layer in `styles.css`; `index.html`, `site.webmanifest` theme colors.
- Asset: `public/avatar-default.png` (transparent STA-BY mascot).
- Plans: `docs/plans/gentelella-redesign-plan.md`, `docs/plans/gentelella-fidelity-audit.md`.
- This log (updated from the morning branch-only stub).

## Verification

- `npm run typecheck` — pass.
- `npm test` — pass.

## Pending

- Confirm whether a newer KB avatar reappears after `tmp/imagegen` cleanup; re-sync if so.
- Push / PR for `experiment/gentelella-redesign` only when requested.
- Remaining fidelity/polish items from the redesign plan and audit.
