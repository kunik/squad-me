# Notification channels UI + divisions value style

## Summary
Reworked «Сповіщення» preferred/connected affordances: no row highlight/hover,
edit shows disabled radios for unconnected channels, view shows only the
preferred radio (others keep a spacer). Refactored off Gentelella `list-group`
to `.channel-row`. Divisions summary uses plain `field-view-value` (dropped
muted `discipline-meta`).

## Key decisions
- Preferred ≠ connected: left radio/mark vs green status icon on the right.
- View preferred mark = real `input[type=radio]:checked` (disabled), not a CSS fake.
- Drop `list-group` / `.active` / `is-preferred` / `data-preferred`.

## Files changed
- `src/client/components/NotificationChannelsForm.tsx`
- `src/client/components/ProfileSummary.tsx`
- `src/client/styles.css`
- `src/client/components/ProfileControls.test.ts`

## Verification
- `npm test -- --run src/client/components/ProfileControls.test.ts` (21 passed)

## Pending
- Preferred-channel persist API still unwired.
