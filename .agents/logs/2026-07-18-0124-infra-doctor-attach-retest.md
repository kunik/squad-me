# 2026-07-18 — infra:doctor + attach retest

## Context

User added **Workers Scripts Edit** to `CLOUDFLARE_API_TOKEN_DNS` and asked to
re-test apex attach, then implement `npm run infra:doctor`.

## Attach retest

`npm run attach:production:hostname` → **exit 0**

- DNS list OK; AAAA `100::` → skip API `1043` (CF-managed)
- Workers domains attach API **succeeded** (no `10000`)
- Verified: workers domain `squadme.app` → `squad-me-production-app`; HTTPS 200;
  `/api/health` → `environment=production`

## infra:doctor

New: `infra-setup/doctor.sh` + `npm run infra:doctor`

- Loads `.env.cloudflare` via `common.sh` (never prints values)
- Reports token roles set: generic / DNS / Access (yes/no only)
- `wrangler whoami` login status
- DNS probe if DNS or generic token set (list zone records)
- Access probe if Access or generic token set (apps, else org)
- Exit 0 if configured probes pass; missing optional → warn; set-but-rejected → fail

Verified locally: DNS ok, Access ok (org), exit 0. Generic token unset (warn path N/A).

## Docs

- `docs/provision.md` — doctor row + sanity-check note
- `.env.cloudflare.example` — points at `npm run infra:doctor`

## Files

- `infra-setup/doctor.sh` (new)
- `package.json` (`infra:doctor`)
- `docs/provision.md`
- `.env.cloudflare.example`
- this log

No commit.
