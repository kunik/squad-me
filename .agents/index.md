# Agent Instructions

## On start

Read in parallel, skipping missing files:
- `.agents/notes.md`
- The two newest files in `.agents/logs/`, sorted by filename descending

## Skills

When a request matches a skill, read its `SKILL.md` before acting.

| Skill | Path | Purpose |
|---|---|---|
| commit | `.agents/skills/commit/` | Prepare and create focused commits safely |
| update-project-docs | `.agents/skills/update-project-docs/` | Keep durable project documentation current |
| update-regression | `.agents/skills/update-regression/` | Record discovered and fixed regressions |
| update-tests | `.agents/skills/update-tests/` | Align tests with behavior changes |
| compress / log | `.agents/skills/compress/` | Save repository and knowledge-base work to separate session logs |
| resume | `.agents/skills/resume/` | Restore context from session logs |
| skill-builder | `.agents/skills/skill-builder/` | Create portable Agent Skills |

## Session memory

- Logs use `.agents/logs/YYYY-MM-DD-HHMM-<slug>.md`.
- Write or update a log before each commit and after significant work when asked.
- Put durable product or engineering knowledge in `docs/`, not session logs.
- Put only non-derivable operational facts in `.agents/notes.md`.
- Never store secrets, credentials, tokens, or personal data in logs or notes.

## Log format

```markdown
# <Session title>

**Date:** YYYY-MM-DD HH:MM

## Summary
<Outcome and current state>

## Key decisions
- ...

## Files changed
- `path` — reason

## Pending
- [ ] ...
```

Omit empty sections and keep logs concise.
