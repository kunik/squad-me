# Infra-setup DevOps refactor + verify

**Date:** 2026-07-18 00:42

## Summary

Refactored one-time bootstrap under `infra-setup/`: shared `provision.sh`, common helpers, safer `database_id` writer with `--check`, surgical inventory updates. Verified idempotent re-runs of `provision:dev` and `provision:production` (exit 0, IDs unchanged, Access row preserved). Apex `squadme.app` still not attached.

## Key decisions

- Keep Access / hostname attach separate from resource provision (different auth).
- Inventory updates must not wipe Access/GitHub human state.
- Fail loudly on unknown wrangler create output; set `CI=1` for migration non-interactive path.

## Verification

- `bash -n` on provision/access/attach/common — OK (shellcheck not installed)
- `write-database-id --check` both envs — OK; rewrite no-op — `unchanged`
- `npm run provision:production` / `provision:dev` — exit 0, already-exists paths
- Access without token — exit 1; token absent so no Access re-run
- `https://squadme.app` — timeout (domain still blocked on 100117)

## Pending

- [ ] Apex DNS clear + attach
- [ ] Access re-run when `CLOUDFLARE_API_TOKEN` available
