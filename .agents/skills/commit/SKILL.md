---
name: commit
description: Prepares and creates a focused git commit with appropriate verification and a mandatory session log. Use when the user asks to commit, stage changes, write a commit message, or finish work with a commit.
---

# Commit

1. **Mandatory session log (never skip).** Before staging/committing, run
   `.agents/skills/compress/SKILL.md` for the **repository** partition that
   covers the work in this commit:
   - Update an existing same-topic log from today under `.agents/logs/`, **or**
     create `.agents/logs/YYYY-MM-DD-HHMM-<slug>.md`.
   - The log must describe the work being committed (summary, decisions, files,
     verification, pending) — not an empty stub and not an unrelated older log.
   - Stage that log file in the **same** commit when it documents the committed
     work.
   - Run knowledge-base compress **only** if this same work changed the KB;
     otherwise skip the KB partition.
   - Do **not** treat prior `/compress` or `/log` from earlier in the session as
     a substitute unless that log already fully covers this commit’s diff.
     If the diff advanced since the last log, update or create a log now.
2. Inspect `git status`, staged and unstaged diffs, and recent commit style.
3. Separate unrelated work. Never discard or overwrite user changes.
4. **Infrastructure / scripts docs gate** — if the change set touches
   `package.json`, Wrangler/bindings, `scripts/` (incl. `infra-setup/`),
   deploy/provision workflows, migrations, or inventory/config reflected in
   those trees: follow `.cursor/rules/infrastructure-documentation.mdc` in the
   **same** change.
   - Matching README(s) + `docs/provision.md` / `deployment.md` / inventory as
     relevant; no stale repo-root `infra-setup/` path references.
   - If infra/script files changed but those docs did not, **stop**: update
     docs (what/why only), then resume. Do not commit with the docs missing.
5. Discover verification commands from repository documentation, package
   manifests, task runners, and CI configuration. Run the smallest relevant
   checks, then broader pre-commit checks when practical.
6. If checks fail, diagnose and report the failure. Do not change product code,
   tests, or snapshots merely to force a pass without user direction.
7. Stage only files in the requested logical change (including the session log
   from step 1 when it documents that change).
8. Use an imperative, concise subject. Add a body when the reason, migration,
   risk, or regression reference is not obvious.
9. Never commit secrets or force-push/rewrite history unless explicitly asked.
10. Create the commit and report its subject, verification performed, and which
    session log was updated or created.
