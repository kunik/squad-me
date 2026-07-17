# Move infra-setup under scripts/

**Date:** 2026-07-18 02:06

## Summary

Moved one-time Cloudflare bootstrap from repo-root `infra-setup/` to
`scripts/infra-setup/`, fixed ROOT/`_REPO_ROOT` depth, updated npm scripts and
durable docs, added `scripts/README.md` + `scripts/infra-setup/README.md`, and
strengthened the infra docs rule + commit skill so script changes require
matching README/docs in the same change. Bundled with optional SHA prod-deploy
workflow (docs intertwined).

## Key decisions

- Bootstrap lives under `scripts/infra-setup/`; runtime helpers stay siblings in
  `scripts/`.
- Docs gate now explicitly covers add/move/rename under `scripts/` and requires
  README + provision/deployment/inventory updates.

## Files changed

- `infra-setup/*` → `scripts/infra-setup/*` (git mv + path/ROOT fixes)
- `scripts/README.md`, `scripts/infra-setup/README.md` (new)
- `package.json` npm script paths
- `docs/provision.md`, `docs/deployment.md`, `docs/inventory-production.md`
- `.env.cloudflare.example`, `.agents/notes.md`
- `.cursor/rules/infrastructure-documentation.mdc`
- `.agents/skills/commit/SKILL.md`
- `.github/workflows/deploy-production.yml` (optional `commit_sha`; same commit)

## Verification

- `bash -n` on all `scripts/infra-setup/*.sh` + `lib/common.sh` — OK
- `_REPO_ROOT` / script ROOT resolve to repo root; old `infra-setup/` absent
- Grep: live docs/code use `scripts/infra-setup/`; only historical
  `.agents/logs/*` keep old paths
- `yaml-lint` on deploy-production workflow OK
- `.env.cloudflare` gitignored; not staged

## Pending

- (none; commit + push requested)
