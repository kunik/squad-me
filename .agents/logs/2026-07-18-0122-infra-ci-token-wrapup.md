# Infra / CI / token / Access / domain wrap-up

**Date:** 2026-07-18 01:22

## Summary

Finished today’s Cloud Dev → Production bootstrap path: Access on Dev, GitHub
Environments + CI green, apex `squadme.app` live, local token loading via
gitignored `.env.cloudflare`, and infra-setup script consolidation. Docs/token
rename verify landed in `78f0bce`; this follow-up commits the remaining
script/template/rule/log work that was still unstaged.

## Key decisions

- Role-specific local tokens (`CLOUDFLARE_API_TOKEN_DNS` / `_ACCESS`, fallback
  `CLOUDFLARE_API_TOKEN`) load from `.env.cloudflare` via
  `infra-setup/lib/common.sh`; agents must run npm scripts, never Read/cat the
  secrets file.
- Shared `provision.sh` for Dev and Production; inventory updates via
  `update-inventory-resources.mjs`.
- Apex attach skips CF-managed AAAA `1043` (`100::`); dry-run supported.
- Dashboard CI tokens named `squad-me-ci-dev` / `squad-me-ci-prod`; GitHub
  secret keys stay `CLOUDFLARE_API_TOKEN` (both Environments set).
- Production stub stays public (no Access); Dev stays Access-gated.

## Files changed

Uncommitted at wrap-up (this commit):

- `infra-setup/lib/common.sh`, `update-inventory-resources.mjs`,
  `write-database-id.mjs`
- `infra-setup/provision.sh`, `attach-production-hostname.sh`,
  `provision-access-*.sh`, `wire-github-ci-secrets.sh`
- `.env.cloudflare.example`, `.gitignore`, `.github/workflows/ci.yml`
- `.cursor/rules/infrastructure-documentation.mdc`
- Session logs under `.agents/logs/2026-07-18-00*` / `01*` (earlier today)

Already committed (`78f0bce`):

- `docs/provision.md`, `docs/deployment.md`, inventories, `.agents/notes.md`,
  `2026-07-18-0119-ci-token-rename-verify.md`

## Verification

- `bash -n` on all modified `infra-setup/*.sh` + `lib/common.sh` — OK
- Prior sessions: Access smoke, Cloud Dev CI green, apex `/api/health` 200,
  `gh secret list` for `cloud-dev` + `production`
- No product/TS changes in this leftover set; KB untouched

## Pending

- Production promote remains owner-gated (Environment reviewer `kunik`)
- Widen DNS token with Workers Scripts Edit if attach API `10000` recurs
  (HTTPS verify already covers “already attached”)
