# Production apex hostname — blocked on DNS token

**Date:** 2026-07-18 00:46

## Summary

Re-attempted attaching `squadme.app` to `squad-me-production-app`. Worker is
uploaded; custom domain still blocked by API **100117**. No DNS records were
deleted — Wrangler OAuth cannot read or edit zone DNS, and
`CLOUDFLARE_API_TOKEN` is not in the local shell.

## Evidence

| Check | Result |
|---|---|
| Worker domains list | Only `dev.squadme.app` → `squad-me-dev-app` |
| `PUT …/workers/domains` (OAuth) | `409` / code `100117` — externally managed A/CNAME |
| `GET …/dns_records` (OAuth) | `403` Authentication error |
| Public dig apex | A → `188.114.96.11` / `188.114.97.11`; AAAA present; MX eforward kept |
| `https://squadme.app` / `/api/health` | curl timeout (~10s) |
| `npm run attach:production:hostname` | Fails: requires `CLOUDFLARE_API_TOKEN` |
| GitHub env secrets | `cloud-dev` has `CLOUDFLARE_API_TOKEN` (not readable); `production` does not |

## DNS removed

None.

## Docs touched

- `docs/inventory-production.md` — status / follow-ups refreshed
- `docs/provision.md` — zone facts note on re-check

## Next user action

1. Create/export a token with **Zone → DNS → Edit** (zone `squadme.app`) +
   **Account → Workers Scripts → Edit**, then:
   `export CLOUDFLARE_API_TOKEN=… && npm run attach:production:hostname`
2. Or Dashboard → [DNS records](https://dash.cloudflare.com/2758c21b02e5c7efcfa745cb49948ace/squadme.app/dns/records)
   → delete only apex A/AAAA/CNAME for exact name `squadme.app` (keep MX/TXT/`dev`)
   → `npm run deploy:production`
3. Verify stub + `/api/health` → `environment=production`
