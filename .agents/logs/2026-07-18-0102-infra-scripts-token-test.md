# Infra setup scripts — token loader smoke test

**Date:** 2026-07-18 01:02

## Summary

Ran npm infra scripts after tokens were added to gitignored `.env.cloudflare`.
Loader works (`Loaded .env.cloudflare`; DNS/Access/fallback keys all `set`).
Provision is idempotent for both envs; D1 IDs unchanged. Production apex is
already live (`environment=production`). Access API returns auth error 10000.
Attach script fails deleting a read-only apex AAAA (`100::`, code 1043).

## Results

| Command | Exit | Outcome |
|---|---|---|
| `bash -n` (provision, access, attach, common, smoke, wire) | 0 | Syntax OK |
| `npm run provision:dev` | 0 | Idempotent; D1 unchanged |
| `npm run provision:production` | 0 | Idempotent; D1 unchanged |
| `write-database-id.mjs --check` (dev + prod) | 0 | IDs match wrangler.jsonc |
| `npm run provision:access:dev` | 1 | Token loaded; API `10000` Authentication error |
| `npm run provision:access:smoke:dev` | 1 | Same `10000` on Access apps list |
| `npm run attach:production:hostname` | 1 | DNS token works; delete AAAA → `1043` read-only |
| `curl https://squadme.app/` | 0 | HTTP 200 |
| `curl …/api/health` | 0 | `environment=production` |

## Token pickup evidence (no values)

- Scripts print `Loaded .env.cloudflare (values not shown)` — no longer “missing token”.
- Keys present: `CLOUDFLARE_API_TOKEN_DNS`, `CLOUDFLARE_API_TOKEN_ACCESS`, `CLOUDFLARE_API_TOKEN`.
- DNS path listed zone records successfully (auth OK for DNS).
- Access path reaches Cloudflare Access API but gets `10000` (token present, rejected).

## Docs / inventory

`provision.sh` refreshed `docs/inventory-{dev,production}.md` timestamps/resource rows.
Production hostname marked attached — matches live curl. No further doc edits.

## Next fixes

1. **Access:** Recreate `CLOUDFLARE_API_TOKEN_ACCESS` with Access Apps/Policies + Organizations
   (and IdP/Service Tokens if using smoke). Confirm Zero Trust org exists via
   dashboard (`zt-start`). Re-run `npm run provision:access:dev`.
2. **Attach script:** Treat CF-managed apex AAAA (`100::` / API `1043`) as
   already-attached; skip delete and verify Workers custom domain instead of failing.
