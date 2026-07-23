# Profile widgets: Gentelella toggles + DateField affix

## Summary

Closed the remaining fidelity-audit Profile widget items: membership/discipline
enable blocks now use Gentelella `.toggle-row` + `.toggle` via shared
`CollapsibleToggleBlock`; DateField aligns with `.input-affix` and an SVG
calendar icon. Audit checklist marked both done; shell-polish items were already
committed earlier.

## Key decisions

- Keep bordered collapsible blocks (product pattern) but swap checkbox+chevron
  headers for template toggle switches (`role="switch"`).
- Read-only summary uses the same visual toggle (`aria-disabled`) instead of
  Yes/No status rows.
- DateField stays a custom portal calendar; markup/chrome moves to
  Gentelella `input-affix` + tokenized popover shadow — not a full template
  datepicker port.
- Topbar/auth/profile IA remain won't-fix per prior audit decisions.

## Files changed

- `src/client/components/CollapsibleToggleBlock.tsx` (new)
- `src/client/components/ProfileDetailsForm.tsx`
- `src/client/components/DivisionsForm.tsx`
- `src/client/components/ProfileSummary.tsx`
- `src/client/components/DateField.tsx`
- `src/client/styles.css`
- `src/client/components/ProfileControls.test.ts`
- `src/client/components/DateField.test.ts`
- `docs/plans/gentelella-fidelity-audit.md`

## Verification

- `npm test -- --run src/client/components/ProfileControls.test.ts src/client/components/DateField.test.ts` — 23 passed
- `npx tsc --noEmit` — clean

## Pending

- Visual smoke on `/profile` edit: UPSF/IPSC/discipline toggles + birth date picker
- Optional later: Profile IA `col-4-8` backlog after product remarks
