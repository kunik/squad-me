# Infra arch-review quick wins

**Date:** 2026-07-18 01:13

## Summary

Closed the two factual gaps from the architecture review: committed
`.env.cloudflare.example` (keys + scope comments only), and fixed
`attach-production-hostname.sh` so CF-managed apex AAAA delete `1043`
(`100::`) is skipped. Documented 1043 / already-attached in
`docs/provision.md`. Access left alone (already fixed).

## Changes

| File | Change |
|---|---|
| `.env.cloudflare.example` | New tracked template (`CLOUDFLARE_API_TOKEN{,_DNS,_ACCESS}`, optional account + Access client pair) |
| `infra-setup/attach-production-hostname.sh` | Skip DELETE `1043`; `ATTACH_DRY_RUN=1`; verify HTTPS `/api/health`; soft Workers domains check |
| `docs/provision.md` | Troubleshooting rows for `1043` / already-attached + dry-run note |

`.gitignore` already had `!.env.cloudflare.example`. Notes / infra rule paths
already matched — no edit.

## Verify

| Check | Result |
|---|---|
| `bash -n` attach + common | 0 |
| `ATTACH_DRY_RUN=1 npm run attach:production:hostname` | 0 — lists AAAA `100::` |
| `npm run attach:production:hostname` | 0 — skip 1043; attach API `10000` (DNS token); HTTPS 200 + `environment=production` → already attached |

## Still open

- `CLOUDFLARE_API_TOKEN_DNS` can read/delete zone DNS but Workers domains
  PUT/GET returns `10000` — widen token with Workers Scripts Edit (or rely on
  HTTPS verify when apex is already CF-managed).
- Production GitHub `CLOUDFLARE_API_TOKEN` still unset (separate from Dev).
- No git commit (not requested).
