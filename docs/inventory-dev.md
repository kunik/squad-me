# Cloud Dev inventory

Generated: 2026-07-17T22:04:20Z
Updated: 2026-07-17T22:10:03Z (Access smoke token)

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
| Access | App `squad-me-dev` (6cc17162-60ea-435a-8557-424ef2695e55); policy `Allow Dev operators`; allow taras.kunch@gmail.com; host `dev.squadme.app` |
| Zero Trust team | `squad-me` → `squad-me.cloudflareaccess.com` |
| Access CI smoke | Service token `squad-me-gha-smoke` (bfbff201-daee-49b8-a75b-ebe09e815c26); policy `Allow CI smoke`; client_id set in GitHub `cloud-dev` |
| GitHub env | `cloud-dev`: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (`squad-me-ci-dev`), `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` **set**. Deploy + smoke green via GHA |

## Manual follow-ups

- [x] Attach custom domain `dev.squadme.app` (deploy created DNS + cert)
- [x] Cloudflare Access application for `dev.squadme.app` (`npm run provision:access:dev` after ZT onboarding)
- [x] GitHub Environment `cloud-dev`: `CLOUDFLARE_API_TOKEN` (`squad-me-ci-dev`) + `CLOUDFLARE_ACCOUNT_ID`
- [x] `squad-me-ci-dev` Zone Workers Routes + Access scopes (GHA deploy + smoke bootstrap)
- [x] Access service token for GHA smoke (`provision-access-smoke.yml`)
- [ ] `wrangler secret put` for Dev identity/session/notification test keys (`--env dev`)
- [x] First deploy: `npm run deploy:dev` (smoke: `/api/health`, `/api/db-smoke`, `/api/match-do-ping` OK)
- [x] GHA Deploy Cloud Dev green (migrate · deploy · Access smoke)

## Production (see `docs/inventory-production.md`)

Production `squad-me-production-*` resources exist; Worker + apex `squadme.app`
attached (see `docs/inventory-production.md`). `limits.cpu_ms` omitted on Free
plan for both envs (parity); re-add when Workers Paid.
