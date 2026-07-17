# Infra-setup unify + prod apex blocked

**Date:** 2026-07-18 00:41

## Summary

Moved one-time bootstrap into `infra-setup/`, unified near-duplicate Dev/Production provision into `provision.sh <env>`, and documented apex attach failure (API 100117). Production Worker is uploaded; `squadme.app` custom domain still not attached (needs Zone DNS Edit or Dashboard delete of conflicting A/AAAA/CNAME).

## Key decisions

- One-time infra lives in `infra-setup/`; seed/smoke/parity stay in `scripts/`.
- Shared `provision.sh` for `dev|production`; Access, apex attach, and CI secret wiring stay separate (different credentials/APIs).
- `wrangler.jsonc` `database_id` write extracted to `infra-setup/lib/write-database-id.mjs` (avoids bash/regex quoting bugs).
- Inventory rewrite preserves Access row and `[x]` follow-ups on re-run.

## Files changed

- `infra-setup/provision.sh` (new unified)
- `infra-setup/lib/write-database-id.mjs` (new)
- Removed `infra-setup/provision-dev.sh`, `infra-setup/provision-production.sh` (and prior `scripts/provision-dev.sh`)
- Kept separate: `provision-access-dev.sh`, `attach-production-hostname.sh`, plus sibling Access-smoke / CI wire scripts
- `package.json` npm scripts point at new paths
- `docs/provision.md`, `docs/deployment.md`, inventories, `.agents/notes.md`, infra docs rule / commit skill

## Verification

- `write-database-id.mjs` dry rewrite for known Dev/Prod IDs succeeded
- `https://squadme.app` still times out / not attached (100117 path)

## Pending

- [ ] Clear apex DNS conflicts + attach `squadme.app` (`npm run attach:production:hostname` or Dashboard)
- [ ] Verify stub + `/api/health` → `environment=production`
- [ ] Commit when asked
