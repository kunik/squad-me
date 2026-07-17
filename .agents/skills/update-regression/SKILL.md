---
name: update-regression
description: Maintains docs/regression.md whenever a bug is discovered, reproduced, investigated, or fixed. Use for "document this bug", "add to regression", regression reviews, and bug-fix work.
---

# Update Regression Specifications

1. Ensure `docs/regression.md` exists; preserve its established format.
2. Create one entry per distinct bug. Use `<AREA>-<NNN>` with a short stable
   subsystem tag and the next available number.
3. Record status, affected area, concrete reproduction steps, expected
   behavior, actual behavior, and test coverage.
4. Mark unfixed bugs Open. When fixed, record the commit only after it exists.
5. Update existing entries instead of creating duplicates.
6. Invoke the update-tests workflow when behavior is testable. If coverage is
   impractical, record the reason explicitly.
7. Keep the regression entry with the fix or in a separate documentation commit
   when the fix will come later.
