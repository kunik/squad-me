# Profile polish: toggles, labels, channel icons

## Summary

Closed post-toggle fidelity polish on Profile/auth forms: read-only membership
shows Так/Ні; security actions are quiet outlines; channel status uses chrome
stroke SVG; membership/discipline switches mark dirty (PROFILE-013); identity
fields share a bordered panel; field labels focus controls; (i) hints leave Tab
order. Project rule `form-field-labels.mdc` added.

## Key decisions

- Read-only toggles → text Так/Ні (not disabled switches).
- Aside security actions → `btn-outline` without fill; delete stays outline +
  red accent.
- Channel connected/disconnected → inline SVG matching chrome stroke set; delete
  legacy PNGs (+ unused calendar PNG).
- Switch buttons do not fire form `change` → explicit `markDirty()` in handlers.
- Identity (nickname / birth / gender) → shared `.profile-form__panel` frame.
- `FieldLabel` is a real `<label htmlFor>`; `FieldHint` uses `tabIndex={-1}`.

## Files changed

- `src/client/components/{CollapsibleToggleBlock,ProfileDetailsForm,ProfileSummary,DivisionsForm,ProfileAside,NotificationChannelsForm,FieldHint,PasswordField,DateField}.tsx` (+ tests)
- `src/client/pages/{Register,ForgotPassword,ChangePhone}Page.tsx`
- `src/client/styles.css`, `docs/plans/gentelella-fidelity-audit.md`, `docs/regression.md` (PROFILE-013 + index)
- `.cursor/rules/form-field-labels.mdc`
- Deleted `public/icon-channel-*.png`, `public/icon-calendar.png`

## Verification

- `npm test -- --run FieldHint.test.ts ProfileControls.test.ts DateField.test.ts` — 25 passed

## Pending

- Visual smoke: label click focus, dirty cancel dialog after membership toggle,
  channel SVG status colors on light/dark
