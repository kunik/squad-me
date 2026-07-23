---
name: update-regression
description: Maintains docs/regression.md whenever a bug is discovered, reproduced, investigated, or fixed. Use for "document this bug", "add to regression", regression reviews, and bug-fix work.
---

# Update Regression Specifications

1. Ensure `docs/regression.md` exists; preserve its established format.
2. **Triage:** read the **index table** near the top first. Open a full entry
   only for relevant Open IDs or a matching area — do not load the whole file
   by default.
3. Create one entry per distinct bug. Use `<AREA>-<NNN>` with a short stable
   subsystem tag and the next available number. Add a row to the index table
   in the same change.
4. Record status, affected area, concrete reproduction steps, expected
   behavior, actual behavior, and test coverage.
5. Mark unfixed bugs Open. When fixed, record the commit only after it exists
   (do not invent SHAs); keep the index Status column in sync.
6. Update existing entries instead of creating duplicates.
7. Invoke the update-tests workflow when behavior is testable. If coverage is
   impractical, record the reason explicitly.
8. Keep the regression entry with the fix or in a separate documentation commit
   when the fix will come later.
9. If shortening an entry or the index prose: apply the Shortening docs gate in
   `.agents/index.md` (OLD vs NEW meaning must match before save).
