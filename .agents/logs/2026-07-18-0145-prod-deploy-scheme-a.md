# Session: Production deploy scheme A (+ checkout failure)

Date: 2026-07-18 ~01:45–01:50

## Summary

Production deploy uses **scheme A**: manual `workflow_dispatch` only; deploy
`github.sha` of the selected branch tip; no GitHub Environment required
reviewers. Fixed checkout failure caused by optional `commit_sha` input when
a short SHA was pasted. Same delivery also includes `infra:doctor`, attach
health soft-fail, and wrangler auth loading `.env.cloudflare`.

## Key decisions

- Gate = manual Run workflow (choose branch), not Environment reviewers.
- Remove `commit_sha` input entirely; default `actions/checkout@v4`.
- Keep Environment `production` secrets (`CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_API_TOKEN`).

## Files changed

- `.github/workflows/deploy-production.yml` — scheme A checkout/deploy SHA
- `docs/deployment.md`, `docs/provision.md`, `docs/inventory-production.md`
- `.agents/notes.md`, `.env.cloudflare.example`
- `infra-setup/doctor.sh` + `npm run infra:doctor`
- `infra-setup/attach-production-hostname.sh` (`ATTACH_SKIP_HEALTH`)
- `infra-setup/lib/common.sh` (`require_wrangler_auth` loads env file)
- `package.json`
- Session logs under `.agents/logs/2026-07-18-0124*`, `0140*`, `0145*`

## Verification

- `bash -n` on doctor / attach / common.sh
- Workflow shape: no `commit_sha` / `steps.sha`; `workflow_dispatch` only
- Infra docs gate: provision + deployment + inventory-production updated

## Pending

- User: Actions → Deploy Production → Run on `main` (after push)

## CI failure (context)

- Run 29618619080: short SHA `704ad14` treated as branch/tag → checkout exit 1
