# Coming-soon brand stub

**Date:** 2026-07-18 00:14

## Summary

Replaced the scaffold health-check landing with a brand coming-soon page:
full logo, dark neutral + tactical orange palette, Inter, support line only
(no «Незабаром» headline).

## Key decisions
- Logo is the hero brand signal; no competing headline.
- Palette from KB brand brief (`#E8823C` accent on dark neutral).
- Inter for body/display on this stub (not Barlow Condensed).

## Files changed
- `public/logo-full.svg` — brand logo asset
- `src/client/App.tsx` — coming-soon composition
- `src/client/styles.css` — layout, palette, motion
- `src/client/main.tsx` — import styles
- `index.html` — meta, Inter, Ukrainian lang

## Verification
- `npm run typecheck` — pass
- `npm test` — pass
- `npm run build` — pass

## Pending
- [ ] Commit coming-soon client stub (still dirty after domain deploy commit)
- [ ] Cloudflare Access + secrets for Dev
- [ ] Production resources / custom domain
