# Avatar frame polish

**Date:** 2026-07-21 14:01
**Repo:** squad-me
**Status:** implemented in working tree (same uncommitted auth/profile WIP vs `8ed2f80`)

## Summary

Profile avatar ring now uses a diagonal accent gradient (warm TL → muted BR),
matching the featured-card chrome language. Header (user-menu) avatar stays a
thin grey `--panel-border` like content panels. Fixed hover oval: trigger was
taller than wide (`min-height` without matching width); now a square circle.

## Key decisions

- **Large profile avatar:** gradient frame via `--avatar-frame` +
  `padding-box` / `border-box` double background (not solid accent border).
- **Small header avatar:** thin grey `1px solid var(--panel-border)` — same
  token as ordinary blocks; stronger grey on hover only.
- **User-menu trigger:** fixed `2.75rem × 2.75rem`, `border-radius: 50%`, no
  `min-height`-only pill — keeps hover wash circular and touch target ~44px.

## Files changed

- `src/client/styles.css` — `--avatar-frame`, `.profile-page__avatar` gradient
  ring, `.user-menu__avatar` panel border, circular `.user-menu__trigger`

## Verification

- Visual check in browser (profile + header hover). Automated suite not re-run
  for CSS-only polish.

## Pending

- Full auth/profile working tree still uncommitted (see
  `2026-07-21-0159-auth-profile-since-head.md`).
