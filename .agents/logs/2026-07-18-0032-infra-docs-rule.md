# Infrastructure documentation rule + commit gate

**Date:** 2026-07-18 00:32

## Summary

Added an always-on project rule for infrastructure documentation and scripting
discipline, and extended the commit skill with an infra → docs update gate.
Did not commit working-tree prod deploy artifacts; did not continue apex domain
attach.

## Key decisions

- Rule lives in `.cursor/rules/infrastructure-documentation.mdc` (`alwaysApply`).
- Docs should describe script purpose/outcomes, not script internals.
- Commit skill refuses to commit infra changes without matching doc updates.

## Files changed

- `.cursor/rules/infrastructure-documentation.mdc` — new project rule
- `.agents/skills/commit/SKILL.md` — infra docs gate before commit
- `.agents/logs/2026-07-18-0032-infra-docs-rule.md` — this log

## Pending

- [ ] Finish Production custom domain attach for `squadme.app` (prior session)
- [ ] Align `docs/provision.md` / notes with Production provision script + inventory
  when committing that work
