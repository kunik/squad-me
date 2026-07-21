# 2026-07-21 · Profile collapsible chevrons (edit-only)

## Summary

Documented the UX decision that profile nested-block expand/collapse chevrons
are edit-mode only. Implementation was already in the working tree; this session
only recorded the product decision.

## Key decisions

- Chevron («пташка») on blocks like «я член ФПСУ» / «Я стріляю карабінні матчі»
  is shown **only in edit mode**.
- View/read-only mode hides the chevron; nested content still displays when
  membership/discipline is enabled.

## Files changed

- `.agents/notes.md` — durable working-note bullet
- Obsidian `products/match-platform/design/screens/user-profile.md` — screen UX
- Obsidian `products/match-platform/notes.md` — short UX bullet
- (code already done earlier: `ProfileSummary.tsx`, `styles.css`,
  `ProfileControls.test.ts`; `ProfileForm` still shows chevrons)

## Pending

- Uncommitted; no commit requested
