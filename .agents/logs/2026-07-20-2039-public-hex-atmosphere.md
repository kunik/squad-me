# Public honeycomb atmosphere

**Date:** 2026-07-20 20:39

## Summary

Replaced the public-surface square grid drift with a flat-top hexagon honeycomb: large cells, hairline strokes, and a slow ±2.5% scale breathe. Documented the recipe in KB design principles / brand brief and `.agents/notes.md`.

## Key decisions

- Honeycomb SVG data-URI (not CSS linear-gradient grid); tile 72×41.569, displayed at **288×166.275**.
- Avoid `rgba()` inside CSS `url("data:image/svg+xml,…)`)` — unescaped `)` truncates the URL and breaks the pattern; use `#ffffff` + `stroke-opacity`.
- Motion is `hex-breathe` (`scale` 0.975↔1.025 over 48s), not positional drift.
- Stroke width **0.35** for super-thin lines.

## Files changed

- `src/client/styles.css` — `.public-surface__grid` + `hex-breathe` keyframes
- `.agents/notes.md` — atmosphere note on unauth home
- KB `products/match-platform/design/principles.md` — atmosphere recipe updated
- KB `products/match-platform/specs/brand-brief.md` — atmosphere one-liner
- `.agents/logs/2026-07-20-2039-public-hex-atmosphere.md` (this log)

## Verification

- Visual check on local Vite (`localhost:5173`) after HMR
- `npm run typecheck` — not required for CSS-only; skipped unless commit gate asks

## Pending

- None for this visual change
