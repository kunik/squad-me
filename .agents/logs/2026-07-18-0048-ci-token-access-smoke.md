# CI token wired; Access smoke + Zone routes pending

## Summary

Verified `cloud-dev` has `CLOUDFLARE_API_TOKEN` (`squad-me-ci`) and
`CLOUDFLARE_ACCOUNT_ID`. `production` has ACCOUNT_ID + required reviewer `kunik`.
CI workflow is green. Deploy Cloud Dev failed on Zone Workers Routes auth
(`10000`), before smoke. Added one-shot Access smoke provision workflow.

## Key decisions

- Prefer environment secrets on `cloud-dev` (matches `deploy-dev.yml`).
- Dev token must include **Zone** Workers Routes Edit for custom domains.
- Access smoke bootstrap via `provision-access-smoke.yml` + short-lived
  `TEMP_GH_TOKEN` so GHA can write `CF_ACCESS_CLIENT_*` without printing values.

## Verification

- `gh secret list --env cloud-dev`: ACCOUNT_ID + API_TOKEN present
- CI run after secret-scan fix: success
- Deploy Dev: failed at Deploy step (routes auth), smoke skipped

## Pending

- [ ] Edit `squad-me-ci`: Zone squadme.app → Workers Routes → Edit
- [ ] Add Access scopes (or create service token in ZT UI) and run
      Provision Access smoke secrets workflow
- [ ] Delete `TEMP_GH_TOKEN` after bootstrap
- [ ] Re-run Deploy Cloud Dev to green
