# Production inventory

Generated: 2026-07-17T21:29:30Z  
Updated: 2026-07-17T21:40:00Z (resources + Worker upload; apex attach blocked)

| Resource | Name / value |
|---|---|
| Worker | `squad-me-production-app` (uploaded via `npm run deploy:production`) |
| Hostname | `squadme.app` (Worker custom domain — **not attached yet**; API `100117`) |
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

- [ ] Attach custom domain `squadme.app` — conflicting apex A/AAAA/CNAME (API `100117`). Prefer `npm run attach:production:hostname` (token with Zone DNS Edit + Workers Scripts Edit), or Dashboard DNS delete those records then `npm run deploy:production`
- [ ] Verify stub + health: `https://squadme.app` and `https://squadme.app/api/health` → `environment=production`
- [ ] `wrangler secret put` for Production identity/session/notification keys (`--env production`)
- [x] GitHub Environment `production` created with required reviewer `kunik` + `CLOUDFLARE_ACCOUNT_ID`
- [ ] GitHub Environment `production` secret `CLOUDFLARE_API_TOKEN` (Production-scoped; separate from Dev)
