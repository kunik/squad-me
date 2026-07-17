# Cloud Dev inventory

Generated: 2026-07-17T12:14:25Z

| Resource | Name / value |
|---|---|
| Worker | `squad-me-dev-app` |
| Hostname | `dev.squadme.app` |
| D1 | `squad-me-dev-db` (`bab98e7b-8cbc-423a-aa34-4643f22a1f85`) |
| R2 | `squad-me-dev-files` |
| Queue | `squad-me-dev-jobs` |
| DLQ | `squad-me-dev-jobs-dlq` |
| DO binding | `MATCHES` → `MatchDurableObject` |
| Access | Cloudflare Access required (configure in Zero Trust) |

## Manual follow-ups

- [ ] Attach custom domain `dev.squadme.app` (zone DNS + Worker route already declared in wrangler)
- [ ] Cloudflare Access application for `dev.squadme.app`
- [ ] `wrangler secret put` for Dev identity/session/notification test keys (`--env dev`)
- [ ] GitHub Environment `cloud-dev` secrets: `CLOUDFLARE_API_TOKEN` (Dev-scoped)
- [ ] First deploy: `npm run deploy:dev` then `npm run smoke:dev`
