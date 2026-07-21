# 2026-07-21 · Profile membership & discipline UX decisions

## Summary

Documented durable product UX rules for profile FPSU/IPSC membership blocks and
discipline division defaults (labels, name-language info-note, placeholders,
FieldHint purposes, enable defaults). No app code changes.

## Key decisions

- Toggle labels: «членство ФПСУ» / «членство IPSC (МКПС)»; IPSC number
  «Членський номер».
- One full-width `.profile-form__info-note` above name row (FPSU UA official
  docs; IPSC EN travel docs); quieter than errors, stronger than captions.
- Placeholders: Іван/Франко/Калуш/ССК Барвінок · John/Smith/UA-12345.
- FieldHints: UPSF competitions / national+oblast / city / club matches; IPSC
  Level III; number from membership certificate.
- Enable defaults: pistol `production`, carbine SAO, PCC/mini `pcc_optics`,
  shotgun `open`.
- Chevron edit-only already noted — cross-linked, not re-expanded.

## Files changed

- `.agents/notes.md` — expanded membership/discipline UX bullet
- Obsidian (KB partition logged separately): `notes.md`,
  `design/screens/user-profile.md`, `specs/user-profile.md`
