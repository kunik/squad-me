# Production inventory

Generated: 2026-07-17T22:04:35Z
Updated: 2026-07-17T22:04:35Z (provision resources)

| Resource | Name / value |
|---|---|
| Worker | `squad-me-production-app` |
| Hostname | `squadme.app` (custom domain attached) |
| Zone | `squadme.app` (`c224b051f2d19f3900b68c0d69ffb3c6`) |
| Account | Taras (`2758c21b02e5c7efcfa745cb49948ace`) |
| D1 | `squad-me-production-db` (`24a87010-5fbc-4b2d-87aa-ded2ac769473`) |
| R2 | `squad-me-production-files` |
| Queue | `squad-me-production-jobs` |
| DLQ | `squad-me-production-jobs-dlq` |
| DO binding | `MATCHES` → `MatchDurableObject` |
| Access | **None** for Production stub (public). Dev Access unchanged. |
| Free plan | No `limits.cpu_ms` (parity with Dev; re-add when Workers Paid) |

## Manual follow-ups

- [x] Attach custom domain `squadme.app` (`npm run deploy:production` / Workers custom domain; recover with `npm run attach:production:hostname` + `CLOUDFLARE_API_TOKEN_DNS` in `.env.cloudflare`)
- [x] Verify stub + health: `https://squadme.app` and `https://squadme.app/api/health` → `environment=production`
- [ ] `wrangler secret put` for Production identity/session/notification keys (`--env production`)
- [x] GitHub Environment `production` created with `CLOUDFLARE_ACCOUNT_ID` (no required reviewers; gate = manual `workflow_dispatch`)
- [x] GitHub Environment `production` secret `CLOUDFLARE_API_TOKEN` (`squad-me-ci-prod`; separate from Dev)
