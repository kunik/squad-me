# CI token rename verify

## Summary

Verified GitHub Environments on `kunik/squad-me` after Cloudflare API token
rename to `squad-me-ci-dev` / `squad-me-ci-prod`. Updated durable docs to the
new names and marked Production `CLOUDFLARE_API_TOKEN` as set.

## Key decisions

- Dashboard rename does not change the secret string; only existence of GitHub
  secrets was verified (no values printed, no Production deploy).
- Docs use dashboard token names for operator clarity; GitHub secret keys stay
  `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.

## Files changed

- `docs/provision.md`, `docs/deployment.md`
- `docs/inventory-dev.md`, `docs/inventory-production.md`
- `infra-setup/wire-github-ci-secrets.sh` (comment)
- `.agents/notes.md`

## Verification

- `gh secret list --env cloud-dev`: `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`
- `gh secret list --env production`: `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`
- `production` protection: required reviewer `kunik`
- `cloud-dev`: no required reviewers

## Pending

- None for secret wiring; Production deploy still owner-gated when resources
  ready.
