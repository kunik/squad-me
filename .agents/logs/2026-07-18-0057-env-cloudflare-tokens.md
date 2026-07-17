# Local `.env.cloudflare` token loader + apex status

**Date:** 2026-07-18 00:57

## Summary

Added gitignored `.env.cloudflare` (template `.env.cloudflare.example`) so
infra scripts can load Cloudflare API tokens without agents reading or
displaying the file. Apex `squadme.app` is already live from earlier
`npm run deploy:production` (OAuth); attach script was not re-run successfully
because `.env.cloudflare` is not filled yet.

## Mechanism

| Item | Path |
|---|---|
| Secrets file (gitignored) | `.env.cloudflare` |
| Committed template | `.env.cloudflare.example` |
| Loader | `infra-setup/lib/common.sh` → `load_cloudflare_env` / `require_api_token <purpose> <dns\|access\|any>` |

Scripts updated to use the loader: attach hostname, Access provision, Access
smoke, `ci:wire-secrets`. Docs/rule/notes updated. Agents must run npm scripts;
must not Read/cat `.env.cloudflare`.

## Token recommendation (unchanged vs user tokens)

| Existing token | Scopes | Enough for apex DNS attach? |
|---|---|---|
| `sauad-me-dev` (Access) | Access Policies/Apps/Orgs | No — put in `CLOUDFLARE_API_TOKEN_ACCESS` only |
| `squad-me-ci` | Workers/D1/R2/Queues/Account Settings | No — missing Zone DNS Edit |
| **new `squad-me-dns`** | Zone DNS Edit (`squadme.app`) + Workers Scripts Edit | Yes → `CLOUDFLARE_API_TOKEN_DNS` |

## Attach / verify

| Check | Result |
|---|---|
| `.env.cloudflare` present | No |
| `npm run attach:production:hostname` | Fail: clear “copy example → set DNS token” |
| `https://squadme.app/api/health` | `200` `environment=production` |
| `https://squadme.app/` | `200` |

## Docs / inventory

- `docs/provision.md`, `docs/deployment.md`, inventories, `.agents/notes.md`,
  `.cursor/rules/infrastructure-documentation.mdc` refreshed for loader + apex live.

## Next user action

```bash
cp .env.cloudflare.example .env.cloudflare
# paste squad-me-dns into CLOUDFLARE_API_TOKEN_DNS=
npm run attach:production:hostname   # optional recovery; apex already OK
```

No commit in this session.
