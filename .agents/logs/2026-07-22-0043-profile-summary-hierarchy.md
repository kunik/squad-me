# 2026-07-22 · Profile summary hierarchy + PROFILE-008

## Summary

Clarified `/profile` view-mode hierarchy for divisions and personal details:
enabled «Так» uses accent color; discipline details are one underlined
`Division - PF` line; field labels are globally muted (same in edit and view);
membership/discipline toggle titles are semibold. Fixed PROFILE-008 so `male`
persists independently of birth date (same as `female`).

## Key decisions

- Prefer title-only emphasis for toggles over tinting the whole expanded block.
- Global `.auth-form__label` muted style so labels do not jump when entering
  edit mode.
- Discipline summary: compact `Division - PF` with shared readonly underline,
  quieter than the discipline title.
- `genderBirthForClientSave`: explicit `male`/`female` always persist; empty
  gender fills default male only when a birth date is present.

## Files changed

- `src/client/components/ProfileSummary.tsx` — `is-enabled`, discipline meta line
- `src/client/lib/profileFormValidation.ts` — PROFILE-008 gender save
- `src/client/styles.css` — labels, toggle titles, accent «Так», discipline meta
- `src/client/components/ProfileControls.test.ts` — meta + PROFILE-008
- `docs/regression.md`, `docs/testing.md` — PROFILE-008 coverage notes
- This session log

## Verification

- `npm test -- --run src/client/components/ProfileControls.test.ts` (21 passed)

## Pending

- Existing profiles with `gender: null` need a re-save to show «Чоловіча»
  instead of «—».
