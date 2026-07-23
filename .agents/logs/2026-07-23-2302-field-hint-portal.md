# Field hint portal (PROFILE-014)

## Summary
Field `(i)` tooltips were clipped by `.profile-form__panel { overflow: hidden }`.
`FieldHint` now portals the popover to `document.body` with `position: fixed`
(same escape hatch as DateField calendar).

## Key decisions
- Portal + fixed coords over removing panel `overflow: hidden` (panel still needs
  radius clip on toggle headers).
- Hover visibility moved to JS (`hovered` state) because CSS `:has()` no longer
  reaches a portaled tip.

## Files changed
- `src/client/components/FieldHint.tsx` — portal, fixed placement, hover state
- `src/client/components/FieldHint.test.ts` — PROFILE-014 portal class assert
- `src/client/styles.css` — `.hint-pop` fixed / `.is-visible`
- `docs/regression.md` — PROFILE-014 entry

## Verification
- `npm test -- src/client/components/FieldHint.test.ts src/client/components/ProfileControls.test.ts` (24 passed)

## Pending
- Unrelated working-tree AUTH-006 / auth-exit / ProfileAside changes left unstaged
