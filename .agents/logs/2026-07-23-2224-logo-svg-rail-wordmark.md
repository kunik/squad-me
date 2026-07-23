# Text wordmark lockup + SVG marks + sequenced rail

**Date:** 2026-07-23 22:24

## Summary
Sidebar/home brand uses mark SVG + text `squadme` wordmark. Desktop rail
collapse hides the wordmark first, then shrinks width; expand grows first,
then fades the wordmark in. Dropped unused raster logos; `icons:regen`
sources `logo-mark-light.svg`.

## Key decisions
- Wordmark is text (`BrandWordmark`), not a full-logo image.
- Prefer vector over raster (`.cursor/rules/ui-icons.mdc`); PNG only for
  platform favicon/PWA derivatives.
- Canonical mark: `public/logo-mark-{light,dark}.svg`; `favicon.svg` copied
  from light on regen.
- Rail timing: wordmark ~180ms, width ~220ms; `prefers-reduced-motion` skips
  delays. Wordmark hide CSS scoped to desktop so mobile drawer keeps text.

## Files changed
- `BrandLogo.tsx`, `BrandWordmark` lockup on `HomePage`, `AccountShell` rail
  sequencing, `sidebarRail.ts` timing helpers
- `styles.css` (wordmark/lockup animation), `gentelella.css` (no
  `display:none` on rail wordmark)
- `public/logo-mark-{light,dark}.svg`; deleted `logo-mark-*.png`,
  `logo-full-*.png`; regen favicon/PWA rasters
- `scripts/regen-brand-icons.mjs`, `scripts/README.md`, `ui-icons.mdc`

## Verification
- `npm run icons:regen` OK
- `npx tsc --noEmit` OK

## Pending
- None for this change set
