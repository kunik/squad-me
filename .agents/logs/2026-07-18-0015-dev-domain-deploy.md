# Cloud Dev domain + first deploy

**Date:** 2026-07-18 00:15

## Summary

Confirmed zone `squadme.app` on account Taras, attached Worker custom domain
`dev.squadme.app`, completed first Cloud Dev deploy + smoke. Removed
`limits.cpu_ms` from both Wrangler envs so Free-plan deploys and parity pass.

## Key decisions
- Zone already active; deploy attaches custom domain (no pre-created CNAME).
- Account `workers.dev` subdomain `squad-me` required once; Dev Worker keeps
  `workers_dev: false`.
- Omit `limits.cpu_ms` on Free plan (API 100328); keep Dev/Prod parity.

## Files changed
- `wrangler.jsonc` — drop `limits.cpu_ms` on Free plan (dev + production)
- `docs/provision.md`, `docs/inventory-dev.md`, `docs/deployment.md` — zone,
  domain, deploy facts
- `.agents/notes.md` — durable account/zone/deploy facts

## Verification
- `npm run parity:check` — pass after Free-plan limits alignment
- `npm run typecheck` / `npm test` / `npm run build:dev` — run at commit time
- Prior session: `deploy:dev` + smoke (`/api/health`, `/api/db-smoke`,
  `/api/match-do-ping`) OK

## Pending
- [x] Cloudflare Access for `dev.squadme.app` (see `2026-07-18-0028-access-dev-live.md`)
- [ ] Dev secrets + GitHub Environment `cloud-dev`
- [ ] Production resources / apex custom domain
