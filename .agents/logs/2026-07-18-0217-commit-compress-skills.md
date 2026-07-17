# Tighten commit + compress skills

**Date:** 2026-07-18 02:17

## Summary

Made the commit skill’s session-log step mandatory and explicit: run compress
for the repository partition covering the commit, require a non-stub log that
matches the diff, stage that log in the same commit, skip KB compress unless KB
changed, and do not reuse an earlier `/compress` unless it fully covers the
current diff. Updated compress skill description so commit can invoke it as a
required pre-commit step.

## Key decisions

- Session log is never optional for commits; prior logs only count if they fully
  cover the commit’s diff.
- KB partition runs only when the same work changed the knowledge base.
- Commit reporting must include which session log was created or updated.

## Files changed

- `.agents/skills/commit/SKILL.md` — mandatory session-log step + report log path
- `.agents/skills/compress/SKILL.md` — description mentions commit skill use
- `.agents/logs/2026-07-18-0217-commit-compress-skills.md` — this log

## Verification

- Diff reviewed: only the two skill files (plus this log); no secrets
- Infra docs gate N/A (no wrangler/scripts/workflows/inventory changes)
- `.env.cloudflare` not present in change set

## Pending

- None
