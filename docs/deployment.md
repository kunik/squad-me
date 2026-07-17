# Deployment

Two-tier delivery: local `workerd` inner loop → Cloud Dev parity → manual
Production promote. Product canon:
`products/match-platform/specs/deployment.md` (Obsidian KB).

## Environments

| Tier | Worker | Hostname | Trigger |
|---|---|---|---|
| Local | `squad-me-local` (not deployed) | localhost | `npm run dev` |
| Cloud Dev | `squad-me-dev-app` | `dev.squadme.app` | merge to `main` |
| Production | `squad-me-production-app` | `squadme.app` (Worker custom domain; see inventory) | manual + approval |

Logical bindings are identical everywhere: `DB`, `MATCHES`, `JOBS`, `FILES`.
Only resource IDs, hostnames, secrets, and sampling differ.

## Build once

1. `CLOUDFLARE_ENV=dev vite build` → `dist/` for Cloud Dev.
2. Same commit later: `CLOUDFLARE_ENV=production vite build` → Production.
3. Do **not** rebuild different source for Production; promote the tested SHA.

The Cloudflare Vite plugin selects the Wrangler named environment at **build**
time via `CLOUDFLARE_ENV`. After `vite build`, `wrangler deploy` uses the
generated output config under `dist/` (do not pass a conflicting `--env` that
re-resolves a different source tree).

Migrations and secrets still use Wrangler `--env`:

```bash
npx wrangler d1 migrations apply DB --remote --env dev
npx wrangler secret put SESSION_SIGNING_KEY --env dev
```

## Local inner loop

```bash
cp .dev.vars.example .dev.vars
npm install
npm run migrations:local
npm run dev
```

Full local simulation: D1, Durable Objects, Queues, R2. No Cloudflare network
required. Remote bindings are opt-in only.

## Provision Cloud Dev

One-time bootstrap scripts live in `infra-setup/` (npm entry points below).
Requires `wrangler login` (or a Dev-scoped API token):

```bash
npm run provision:dev
```

Creates D1 / R2 / Queue / DLQ, writes `database_id` into `wrangler.jsonc`,
applies migrations, and writes `docs/inventory-dev.md`. Custom domain
`dev.squadme.app` attaches on `npm run deploy:dev` (zone already active).
Access on Dev is live (`squad-me-dev` → `dev.squadme.app`). Re-run or extend
with `npm run provision:access:dev` (needs Access-capable API token). Secrets
remain manual (checklist in inventory).

Production resources: `npm run provision:production` (owner-only; never from
PR CI). Apex `squadme.app` is attached to `squad-me-production-app`. If deploy
reports API `100117` again, put `CLOUDFLARE_API_TOKEN_DNS` in `.env.cloudflare`
and run `npm run attach:production:hostname` (or Dashboard DNS one-off; see
`docs/provision.md`). Production hostname is public for the stub (no Access).
GitHub Environments exist (`cloud-dev`, `production` with required reviewer
`kunik`). Wire Dev deploy + Access smoke secrets with `npm run ci:wire-secrets`
(tokens from `.env.cloudflare`; see `docs/provision.md`). Production API token
remains separate / unset until promote CI is enabled; local owner deploy of a
Dev-tested SHA still works.

## CI/CD (GitHub Actions)

| Workflow | When | Deploys? |
|---|---|---|
| `ci.yml` | PR + push `main` | No |
| `deploy-dev.yml` | push `main` / manual | Cloud Dev |
| `deploy-production.yml` | `workflow_dispatch` only | Production |

GitHub Environments:

| Environment | Status |
|---|---|
| `cloud-dev` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (`squad-me-ci`), `CF_ACCESS_CLIENT_*` set; Deploy Cloud Dev green (Access smoke) |
| `production` | `CLOUDFLARE_ACCOUNT_ID` set; required reviewer `kunik`; Production token **not** set |

Cloud Dev smoke sends `CF-Access-Client-Id` / `CF-Access-Client-Secret` when
those environment secrets are present (`scripts/smoke-cloud-dev.ts`). Without
them, Access returns 302 and the deploy job fails.

Concurrency groups `cloud-dev` and `production` serialize deploys.

Workers Builds is **not** used.

## Production promote

1. Confirm Cloud Dev deploy + smoke for the commit SHA succeeded.
2. Run **Deploy Production** workflow (`workflow_dispatch`), optionally passing
   that SHA.
3. Required reviewer approves the `production` environment.
4. Job: D1 export backup → migrations → deploy same SHA → health smoke.
5. Watch metrics 15–30 minutes for high-risk releases.

## Rollback

```bash
npx wrangler rollback --env production   # or via dashboard Versions
```

Only if the last migration was backward-compatible; otherwise forward-fix.
Clients reconnect WebSockets automatically after version change.

## Parity check

```bash
npm run parity:check           # shape (PR)
node scripts/parity-check.mjs --strict   # shape + provisioned IDs (deploy)
```
