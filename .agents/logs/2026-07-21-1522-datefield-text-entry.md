# 2026-07-21 · DateField text entry + calendar icon

## Summary

Birth-date `DateField` now accepts typed dates (not calendar-only). Trigger is a text input; the calendar popover opens from the icon button (or ↓). Replaced `public/icon-calendar.png` with the chosen faceted-glass asset (v4), keyed to a transparent RGBA PNG.

## Key decisions

- Typed formats: `DD.MM.YYYY`, `DD/MM/YYYY`, `DD-MM-YYYY`, and ISO `YYYY-MM-DD`; commit on blur/Enter; invalid or after-`max` input reverts to the last good value.
- Calendar remains optional chrome beside the input (password-field-style control).
- Icon source had a baked black JPEG/PNG background — strip near-black to alpha before shipping in `public/`.

## Files changed

- `src/client/components/DateField.tsx` — text input + calendar button + draft commit
- `src/client/lib/dateField.ts` — `parseDisplayDate`
- `src/client/components/DateField.test.ts`, `src/client/lib/dateField.test.ts`
- `src/client/styles.css` — `.date-field__control` / input / calendar button
- `public/icon-calendar.png` — v4 glass calendar, transparent background

## Verification

- `npm test -- --run src/client/lib/dateField.test.ts src/client/components/DateField.test.ts` — passed

## Pending

- Uncommitted; no commit requested
