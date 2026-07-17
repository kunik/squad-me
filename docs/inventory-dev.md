# Cloud Dev inventory

Generated: 2026-07-17T12:14:25Z  
Updated: 2026-07-17T21:28:00Z (Access verified)

| Resource | Name / value |
|---|---|
| Worker | `squad-me-dev-app` |
| Hostname | `dev.squadme.app` (Worker custom domain; attached) |
| Zone | `squadme.app` (`c224b051f2d19f3900b68c0d69ffb3c6`, status `active`) |
| Account `workers.dev` | `squad-me` (account-level; Worker itself has `workers_dev: false`) |
| D1 | `squad-me-dev-db` (`bab98e7b-8cbc-423a-aa34-4643f22a1f85`) |
| R2 | `squad-me-dev-files` |
| Queue | `squad-me-dev-jobs` |
| DLQ | `squad-me-dev-jobs-dlq` |
| DO binding | `MATCHES` → `MatchDurableObject` |
| Access | **Live.** App `squad-me-dev` (`6cc17162-60ea-435a-8557-424ef2695e55`); policy `Allow Dev operators`; allow `taras.kunch@gmail.com`; host `dev.squadme.app` only |
| Zero Trust team | `squad-me` → `squad-me.cloudflareaccess.com` |

## Manual follow-ups

- [x] Attach custom domain `dev.squadme.app` (deploy created DNS + cert)
- [x] Cloudflare Access application for `dev.squadme.app` (`npm run provision:access:dev` after ZT onboarding)
- [ ] `wrangler secret put` for Dev identity/session/notification test keys (`--env dev`)
- [ ] GitHub Environment `cloud-dev` secrets: `CLOUDFLARE_API_TOKEN` (Dev-scoped)
- [x] First deploy: `npm run deploy:dev` (smoke: `/api/health`, `/api/db-smoke`, `/api/match-do-ping` OK)

## Production leftovers (not done)

- Zone apex `squadme.app` is on Cloudflare but **no** production Worker / custom domain yet.
- Production D1/R2/Queues still unprovisioned (`database_id: PROVISION_REQUIRED`).
- `limits.cpu_ms` omitted on Free plan for both envs (parity); re-add when Workers Paid.
