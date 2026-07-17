---
name: commit
description: Prepares and creates a focused git commit with appropriate verification and a session log. Use when the user asks to commit, stage changes, write a commit message, or finish work with a commit.
---

# Commit

1. Read and follow `.agents/skills/compress/SKILL.md` before committing.
2. Inspect `git status`, staged and unstaged diffs, and recent commit style.
3. Separate unrelated work. Never discard or overwrite user changes.
4. **Infrastructure / scripts docs gate** — if the change set includes any of:
   - `wrangler.jsonc` / Wrangler env or bindings
   - `scripts/infra-setup/*` or other infra bootstrap scripts
   - any add/move/rename/change under `scripts/` (runtime helpers or infra-setup)
   - deploy/provision GitHub workflows (`.github/workflows/deploy*`,
     provision-related workflows)
   - Cloudflare resource/DNS/Access setup reflected in repo config
   - `docs/inventory-*` or other infra inventory
   then verify the matching durable docs were updated in the **same** change:
   - `scripts/README.md` and/or `scripts/infra-setup/README.md` when scripts
     under those trees change (catalog of what/why)
   - `docs/provision.md` (bootstrap, resources, Access, zone, scripted vs manual)
   - `docs/deployment.md` (tiers, CI, promote path) when deploy path changes
   - relevant `docs/inventory-*.md` when resource names/IDs/status change
   - `package.json` npm script paths when script file paths change
   Checklist (all that apply, in the same commit):
   - [ ] Matching README(s) updated
   - [ ] `docs/provision.md` / `docs/deployment.md` / inventory updated as relevant
   - [ ] No stale `infra-setup/` (repo-root) path references left behind
   If infra/script files changed but those docs did not, **stop**: do not commit.
   Update the docs (what/why only — not script internals) per
   `.cursor/rules/infrastructure-documentation.mdc`, then resume.
5. Discover verification commands from repository documentation, package
   manifests, task runners, and CI configuration. Run the smallest relevant
   checks, then broader pre-commit checks when practical.
6. If checks fail, diagnose and report the failure. Do not change product code,
   tests, or snapshots merely to force a pass without user direction.
7. Stage only files in the requested logical change.
8. Use an imperative, concise subject. Add a body when the reason, migration,
   risk, or regression reference is not obvious.
9. Never commit secrets or force-push/rewrite history unless explicitly asked.
10. Create the commit and report its subject plus verification performed.
