# Infra setup (one-time bootstrap)

Idempotent scripts that create or attach Cloudflare resources for Squad Me.
Owner/local only — **not** PR CI. Invoked via npm from the repo root.

Token loading: gitignored `.env.cloudflare` (template `.env.cloudflare.example`)
via `lib/common.sh`. Agents must run `npm run …` so the file is sourced; never
Read/cat `.env.cloudflare`.

Durable checklist and order: `docs/provision.md`. Live IDs:
`docs/inventory-dev.md`, `docs/inventory-production.md`.

When adding, renaming, or changing scripts here, update this README,
`scripts/README.md`, and the matching docs in the **same** change.

## Scripts

| npm script | Script | Why |
|---|---|---|
| `npm run provision:dev` | `provision.sh dev` | Create/reuse Dev D1, R2, Queue/DLQ; write `database_id`; apply remote migrations; update inventory resource rows |
| `npm run provision:production` | `provision.sh production` | Same shared bootstrap for Production (owner-only) |
| `npm run provision:access:dev` | `provision-access-dev.sh` | Cloudflare Access app + allow policy for `dev.squadme.app` (needs Access API token) |
| `npm run provision:access:smoke:dev` | `provision-access-smoke-dev.sh` | Access service token + Service Auth policy so GHA/local smoke can pass Access |
| `npm run attach:production:hostname` | `attach-production-hostname.sh` | Clear conflicting apex DNS and attach `squadme.app` to the Production Worker (needs DNS-capable token) |
| `npm run infra:doctor` | `doctor.sh` | Local auth sanity: which token roles are set (booleans), wrangler whoami, DNS/Workers/Access probes — no secret values printed |
| `npm run ci:wire-secrets` | `wire-github-ci-secrets.sh` | Push Dev CI secrets into GitHub Environment `cloud-dev` from `.env.cloudflare` / env (not the production deploy token) |

## Shared helpers (`lib/`)

| File | Why |
|---|---|
| `lib/common.sh` | Shared logging, `.env.cloudflare` load, token role selection, wrangler auth check |
| `lib/write-database-id.mjs` | Write or `--check` D1 `database_id` in `wrangler.jsonc` without bash/regex quoting bugs |
| `lib/update-inventory-resources.mjs` | Surgical update of resource rows in inventory docs without wiping Access/GitHub notes |

## Related

- Runtime helpers (seed, smoke, parity): parent [`../README.md`](../README.md)
- Provision order / scripted vs manual: `docs/provision.md`
- Deploy tiers / CI: `docs/deployment.md`
