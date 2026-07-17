# Split repository and knowledge-base session logs

**Date:** 2026-07-17 13:04

## Summary
Updated the project log skill to separate repository work from knowledge-base
work and delegate knowledge-base logging to its own `/log` skill.

## Key decisions
- Keep repository and knowledge-base changes in separate logs without
  duplication.
- Write both logs independently and in parallel when both scopes changed.
- Do not create an empty companion log when only one scope changed.

## Files changed
- `.agents/skills/compress/SKILL.md` — partition session work and delegate
  knowledge-base logging.
- `.agents/index.md` — document the split logging behavior.

## Verification
- `git diff --check` passed.
