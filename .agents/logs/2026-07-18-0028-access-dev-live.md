# Cloudflare Access for Dev — live

**Date:** 2026-07-18 00:28

## Summary

Zero Trust org `squad-me` is onboarded. Access app `squad-me-dev` protects
`dev.squadme.app` with policy `Allow Dev operators` (`taras.kunch@gmail.com`).
Unauthenticated health checks redirect to Access login (not a public 200).
Committed Access provision script + docs.

## Key decisions
- Host scope: `dev.squadme.app` only (not `*.dev`).
- Team auth domain: `squad-me.cloudflareaccess.com`.
- Wrangler OAuth still cannot call Access APIs; script needs
  `CLOUDFLARE_API_TOKEN` for future edits.

## Files changed
- `scripts/provision-access-dev.sh`, `package.json` (`provision:access:dev`)
- `docs/provision.md`, `docs/inventory-dev.md`, `docs/deployment.md`
- `.agents/notes.md`

## Verification
- Unauthenticated `GET https://dev.squadme.app/api/health` → HTTP 302 to
  `https://squad-me.cloudflareaccess.com/cdn-cgi/access/login/dev.squadme.app…`
  with `www-authenticate: Cloudflare-Access`
- Well-known: `protected: true`, `team_domain: squad-me.cloudflareaccess.com`
- Login HTML includes app name `squad-me-dev`
- Wrangler OAuth → Access API still auth error (expected)

## Pending
- [ ] Dev secrets + GitHub Environment `cloud-dev`
- [ ] Optional: store Access-capable API token for scripted policy edits
- [ ] Production resources / apex
