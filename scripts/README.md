# Scripts

Repo utilities under `scripts/`. Prefer `npm run …` entry points from the repo
root (`package.json`) over calling files directly.

## Layout

| Path | Role |
|---|---|
| `scripts/` (this dir) | Ongoing runtime / dev helpers (seed, smoke, parity) |
| `scripts/infra-setup/` | One-time Cloudflare bootstrap (provision, Access, DNS attach, CI wire). See [`infra-setup/README.md`](infra-setup/README.md) |

Durable ops docs: `docs/provision.md`, `docs/deployment.md`,
`docs/inventory-*.md`. When adding or changing a script here, update the matching
README and those docs in the **same** change (see
`.cursor/rules/infrastructure-documentation.mdc`).

## Runtime / dev helpers

| npm script | Script | Why |
|---|---|---|
| `npm run parity:check` | `parity-check.mjs` | Compare Dev/Prod Wrangler shape (bindings, compatibility, cron, DO tags). CI PR gate; `--strict` also requires real `database_id`s |
| `npm run seed:local` | `seed-dev.ts --local` | Synthetic seed against local D1 (Dev env). Never production |
| `npm run seed:dev` | `seed-dev.ts --env dev` | Synthetic seed against remote Cloud Dev D1. Never production |
| `npm run smoke:dev` | `smoke-cloud-dev.ts` | Hit `https://dev.squadme.app` health (and expand as features land). Needs Access service-token headers for non-browser runs |

## Infra bootstrap

One-time create/attach/wire scripts live in `scripts/infra-setup/` and are
invoked as `npm run provision:*`, `attach:production:hostname`, `infra:doctor`,
`ci:wire-secrets`. Details: [`infra-setup/README.md`](infra-setup/README.md) and
`docs/provision.md`.
