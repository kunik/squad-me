# Profile form restructure + disciplines

## Summary

Restructured `/profile` form and read-only summary: nickname → birth/gender →
UPSF expand → IPSC expand → four discipline toggles (division + power factor).
**One Save** for the whole form (plus page-level Skip during onboarding).
Per-block Save was rejected as too many buttons.

## Schema / API

- Migration `0008_profile_disciplines.sql`: `pistol_*`, `carbine_*`,
  `pcc_mini_rifle_*`, `shotgun_*` (`enabled` + `division` + `power_factor`).
- Division allow-lists in `src/worker/identity/disciplines.ts` (Obsidian
  `divisions-classes.md`). Defaults: Minor for pistol/carbine/pcc; Major for
  shotgun.
- `POST /api/profile` full-document upsert writes disciplines; UPSF/IPSC off
  clears nested names/region/club. Optional internal `section` merge remains
  for tests / niche callers — UI does not use it.
- Labels: «я член ФПСУ» / «я член IPSC» (EN: “I am a UPSF/IPSC member”).

## Verification

- `npm run typecheck` — pass
- `npm test` — 7 files, 92 tests pass
- `npm run migrations:local` — 0008 applied

## Out of scope

- Commit
- Match registration using disciplines
- `upsf_rank` / `ipsc_class` / real Club entity
