# 2026-07-18 — doctor/attach “tomorrow” improvements

## Summary

Implemented critique follow-ups: doctor loads env before account/zone
defaults; Workers domains/scripts probe; `require_wrangler_auth` loads
`.env.cloudflare` for provision; `ATTACH_SKIP_HEALTH=1` soft-fail on attach;
doctor summary clarifies warn vs provision auth.

## Key decisions

- Workers probe reuses DNS/generic token (same capability attach needs).
- Prefer Workers domains list, fall back to scripts list.
- Soft-fail health returns 1 (warn); hard-fail still `die` unless skip set.
- Dropped `CLOUDFLARE_API_TOKEN` substring from wrangler “not auth” grep
  (false-positive risk); rely on not-authenticated / not-logged-in only.

## Files changed

- `infra-setup/doctor.sh`
- `infra-setup/lib/common.sh`
- `infra-setup/attach-production-hostname.sh`
- `docs/provision.md`
- `.env.cloudflare.example`
- this log

## Verification

- `bash -n` on doctor, common.sh, attach — OK
- `npm run infra:doctor` — exit 0; DNS ok; Workers domains ok; Access org ok
- `ATTACH_DRY_RUN=1 npm run attach:production:hostname` — exit 0; would DELETE
  AAAA `100::` (no mutations)

No commit.
