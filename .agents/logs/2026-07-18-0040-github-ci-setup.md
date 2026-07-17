# GitHub CI setup for Squad Me

## Summary

Created GitHub Environments and wired Access-aware Cloud Dev smoke. Dev/Production
API tokens still require Dashboard creation (Wrangler OAuth lacks token/Access
scopes).

## Key decisions

- Environments via `gh`: `cloud-dev` (no protection) and `production` (required
  reviewer `kunik`).
- Set `CLOUDFLARE_ACCOUNT_ID` on both; leave Production `CLOUDFLARE_API_TOKEN`
  unset until a separate Production-scoped token exists.
- Smoke uses Access service token headers (`CF_ACCESS_CLIENT_*`); provision via
  `npm run provision:access:smoke:dev`, wire via `npm run ci:wire-secrets`.
- One-time bootstrap scripts live under `infra-setup/` (npm entry points).

## Files changed

- `.github/workflows/deploy-dev.yml` — Access smoke secrets
- `scripts/smoke-cloud-dev.ts` — Access headers + clear 302 error
- `infra-setup/*` — provision + wire-secrets scripts (moved/added)
- `docs/provision.md`, `docs/deployment.md`, inventories, `docs/testing.md`
- `package.json` — `provision:access:smoke:dev`, `ci:wire-secrets`

## Verification

- `gh` environments created; ACCOUNT_ID secrets present on both
- Wrangler OAuth probed: cannot create API tokens or Access service tokens
- Workflow YAML structure checked; `npm run ci:wire-secrets` prints token checklist

## Pending

- [ ] Create Dev Cloudflare API token in Dashboard; `npm run ci:wire-secrets`
- [ ] `npm run provision:access:smoke:dev` + wire Access secrets
- [ ] Separate Production API token for `production` env
- [ ] Push/enable Actions run after commit
