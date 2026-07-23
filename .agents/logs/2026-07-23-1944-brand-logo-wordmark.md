# Align header logo with official wordmark

**Date:** 2026-07-23 19:28

## Summary
Replaced incorrect title-case “Squad Me” chrome wordmark with lowercase Inter Bold `squadme` (`me` in pumpkin). Swapped single SVG logos for light/dark PNG mark and full assets, theme-aware via `BrandMark`/`BrandFullLogo`, and regenerated favicon/PWA derivatives from the light mark.

## Key decisions
- Wordmark is one word `squadme` (no space), matching official full logo.
- Light assets for dark surfaces; dark assets for light surfaces; sidebar always uses light mark.
- Removed Gentelella leftover `border-radius` / `overflow:hidden` on `.brand-icon`.
- Favicon SVG uses Floral `#FEF8EC` (not pure white); opaque icons on `#050609`.
- `npm run icons:regen` owns favicon/apple-touch/PWA rebuilds from `logo-mark-light.png`.

## Files changed
- `src/client/components/BrandWordmark.tsx` — shared lowercase accented wordmark
- `src/client/components/BrandLogo.tsx` — theme/surface-aware mark + full logo
- `src/client/components/GuestChrome.tsx`, `AccountShell.tsx`, `HomePage.tsx` — use brand components
- `src/client/gentelella.css`, `styles.css` — Inter Bold, accent `me`, no mark radius, theme logo CSS
- `public/logo-mark-{light,dark}.png`, `logo-full-{light,dark}.png` — new brand exports
- `public/favicon.*`, `apple-touch-icon.png`, `icon-{192,512}.png`, `icon-maskable-*.png` — regenerated
- deleted `public/logo-mark.svg`, `public/logo-full.svg`
- `scripts/regen-brand-icons.mjs`, `scripts/README.md`, `package.json` — icons:regen + sharp
- `.cursor/rules/ui-icons.mdc`, `.agents/notes.md` — asset naming + regen note

## Verification
- `npm run icons:regen` succeeded; visual check of favicon-32, apple-touch, maskable-512
- Linter clean on touched TSX

## Pending
- None for this change set
