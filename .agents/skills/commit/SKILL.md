---
name: commit
description: Prepares and creates a focused git commit with appropriate verification and a session log. Use when the user asks to commit, stage changes, write a commit message, or finish work with a commit.
---

# Commit

1. Read and follow `.agents/skills/compress/SKILL.md` before committing.
2. Inspect `git status`, staged and unstaged diffs, and recent commit style.
3. Separate unrelated work. Never discard or overwrite user changes.
4. Discover verification commands from repository documentation, package
   manifests, task runners, and CI configuration. Run the smallest relevant
   checks, then broader pre-commit checks when practical.
5. If checks fail, diagnose and report the failure. Do not change product code,
   tests, or snapshots merely to force a pass without user direction.
6. Stage only files in the requested logical change.
7. Use an imperative, concise subject. Add a body when the reason, migration,
   risk, or regression reference is not obvious.
8. Never commit secrets or force-push/rewrite history unless explicitly asked.
9. Create the commit and report its subject plus verification performed.
