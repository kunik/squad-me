# Cloud Dev inventory

Generated: 2026-07-17T21:45:47Z
Updated: 2026-07-17T21:50:00Z (GitHub cloud-dev token set; Zone routes + Access smoke pending)

| Resource | Name / value |
|---|---|
| Worker | `squad-me-dev-app` |
| Hostname | `dev.squadme.app` (Worker custom domain; attached) |
| Zone | `squadme.app` (`c224b051f2d19f3900b68c0d69ffb3c6`) |
| Account `workers.dev` | `squad-me` (account-level; Worker itself has `workers_dev: false`) |
| D1 | `squad-me-dev-db` (`bab98e7b-8cbc-423a-aa34-4643f22a1f85`) |
| R2 | `squad-me-dev-files` |
| Queue | `squad-me-dev-jobs` |
| DLQ | `squad-me-dev-jobs-dlq` |
| Account | Taras (`2758c21b02e5c7efcfa745cb49948ace`) |
| DO binding | `MATCHES` → `MatchDurableObject` |
| Access | **Live.** App `squad-me-dev` (`6cc17162-60ea-435a-8557-424ef2695e55`); policy `Allow Dev operators`; allow `taras.kunch@gmail.com`; host `dev.squadme.app` only |
| Zero Trust team | `squad-me` → `squad-me.cloudflareaccess.com` |
| Access CI smoke | **Pending.** Token `squad-me-gha-smoke` + policy `Allow CI smoke` via `provision-access-smoke.yml` or `npm run provision:access:smoke:dev` |
| GitHub env | `cloud-dev`: `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (`squad-me-ci`) **set**; `CF_ACCESS_CLIENT_*` **pending**. Token needs Zone Workers Routes Edit (deploy) + Access scopes (smoke bootstrap) |

## Manual follow-ups

- [x] Attach custom domain `dev.squadme.app` (deploy created DNS + cert)
- [x] Cloudflare Access application for `dev.squadme.app` (`npm run provision:access:dev` after ZT onboarding)
- [x] GitHub Environment `cloud-dev`: `CLOUDFLARE_API_TOKEN` (`squad-me-ci`) + `CLOUDFLARE_ACCOUNT_ID`
- [ ] Edit `squad-me-ci`: Zone `squadme.app` → Workers Routes → Edit (fixes GHA deploy `10000` on `/workers/routes`)
- [ ] Access service token for GHA smoke (`gh workflow run "Provision Access smoke secrets"` or `npm run provision:access:smoke:dev`)
- [ ] `wrangler secret put` for Dev identity/session/notification test keys (`--env dev`)
- [x] First deploy: `npm run deploy:dev` (smoke: `/api/health`, `/api/db-smoke`, `/api/match-do-ping` OK)

## Production (see `docs/inventory-production.md`)

Production `squad-me-production-*` resources exist; Worker uploaded. Apex
`squadme.app` custom domain still blocked by conflicting DNS (`100117`).
`limits.cpu_ms` omitted on Free plan for both envs (parity); re-add when Workers Paid.
