# Session: Production deploy optional SHA

Date: 2026-07-18 ~01:55–01:57

## Summary

Restored optional `commit_sha` on Deploy Production with correct short-SHA
handling: expand via `gh api` before checkout; empty input always deploys
latest `main` tip (not the Actions UI branch picker). Backup/`COMMIT_SHA`
use post-checkout `git rev-parse HEAD`. Docs and inventory updated.

## Key decisions

- Default ref = `main` HEAD when input empty (ignore UI branch selection).
- Resolve short/full SHA with GitHub Commits API before `actions/checkout`.
- Validate full SHA `^[0-9a-f]{40}$`; never pass short SHA as checkout `ref`
  (fixes prior `refs/heads/704ad14*` failure).
- Keep scheme A: no Environment required reviewers; backup→migrate→deploy→smoke;
  concurrency `production`.

## Files changed

- `.github/workflows/deploy-production.yml` — optional `commit_sha`, resolve + checkout
- `docs/deployment.md`, `docs/provision.md`, `docs/inventory-production.md`
- `.agents/notes.md`

## Verification

- Workflow shape: empty → `ref=main`; set → `gh api` then full SHA checkout
- No `github.sha` in backup/deploy steps; uses `steps.sha.outputs.full_sha`
- `yaml-lint` on workflow OK

## Pending

- (none for this topic; committed with infra-setup move)
