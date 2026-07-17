---
name: update-tests
description: Keeps automated tests aligned with regressions, bug fixes, user-visible behavior, APIs, and major workflows. Use when behavior changes, docs/regression.md changes, or the user asks for test coverage or snapshot updates.
---

# Update Tests

1. Discover the project's frameworks, test locations, helpers, commands, and CI
   expectations from repository files and `docs/testing.md`.
2. Read the related regression entry, feature documentation, production code,
   and nearby tests.
3. Add the smallest stable test that would fail before the fix and pass after
   it. Reuse public interfaces, accessible selectors, fixtures, and helpers.
4. Reference a regression ID in the test name or comment when one exists.
5. Do not delete a regression test because the bug is fixed.
6. Update snapshots only after confirming the output change is intentional.
7. Run focused tests first, then the relevant suite. Diagnose failures rather
   than weakening assertions or adding arbitrary retries.
8. Update `docs/testing.md` when commands, layout, setup, or conventions change.
