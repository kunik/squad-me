# Infrastructure provisioning

Bootstrap checklist for Cloud Dev and Production. Product canon:
`products/match-platform/specs/deployment.md` (Obsidian KB).

## Naming

```text
squad-me-<environment>-app
squad-me-<environment>-db
squad-me-<environment>-jobs
squad-me-<environment>-jobs-dlq
squad-me-<environment>-files
```

Environments: `dev`, `production` (no preview/staging).

Account in use: **Taras** (`2758c21b02e5c7efcfa745cb49948ace`).
Use `npx wrangler …` (local pinned CLI), not a global install.

## What is scripted vs manual

| Step | How |
|---|---|
| Cloudflare login | Manual once: `npx wrangler login` |
| Enable R2 on the account | **Manual** — [R2 Overview](https://dash.cloudflare.com/?to=/:account/r2/overview) (purchase/enable if prompted) |
| D1 + R2 bucket + Queue/DLQ + migrations + `database_id` + inventory | **Script:** `npm run provision:dev` |
| First Worker deploy + smoke | **Script:** `npm run deploy:dev` then `npm run smoke:dev` |
| Zone DNS for `squadme.app` / `dev.squadme.app` | Manual (registrar + Cloudflare zone), then deploy attaches custom domain |
| Cloudflare Access on Dev | Manual (Zero Trust) until we add an API script |
| Worker secrets | Semi-scripted: `npx wrangler secret put <NAME> --env dev` (you supply values) |
| GitHub Environments + tokens | Manual in GitHub UI, or later via `gh` |
| Production resources | Manual / one-off owner run (same naming); never from PR CI |

## Cloud Dev — full order

### 0. Prerequisites (manual)

1. `npx wrangler login` — confirm with `npx wrangler whoami`.
2. Enable **R2** on the account in the Dashboard. Until this is done,
   `wrangler r2 bucket create` fails with code `10042`.
3. Ensure zone `squadme.app` is on this Cloudflare account (or will be), so
   `dev.squadme.app` can become a Worker custom domain.

### 1. Provision resources (script)

```bash
npm run provision:dev
```

Idempotent. Creates / reuses:

- D1 `squad-me-dev-db` and writes `database_id` into `wrangler.jsonc` → `env.dev`
- R2 `squad-me-dev-files`
- Queue `squad-me-dev-jobs` + DLQ `squad-me-dev-jobs-dlq`
- Applies remote D1 migrations (`--env dev`)
- Writes `docs/inventory-dev.md`

Commit the updated `wrangler.jsonc` (and inventory) after a successful run.

### 2. Deploy Worker (script)

```bash
npm run deploy:dev
npm run smoke:dev
```

`deploy:dev` builds with `CLOUDFLARE_ENV=dev` and runs `wrangler deploy`.
Custom domain `dev.squadme.app` is declared in `wrangler.jsonc`; first deploy
attaches it when DNS/zone is ready.

### 3. Protect Dev (manual)

1. Zero Trust → Access → Application for `dev.squadme.app`.
2. Allow only your email / team; block anonymous internet access.
3. Smoke from an allowed identity (Access session cookie).

### 4. Secrets (semi-scripted)

When identity/session/notification test keys exist:

```bash
npx wrangler secret put SESSION_SIGNING_KEY --env dev
npx wrangler secret put IDENTITY_PROVIDER_SECRET --env dev
# …other Dev-only secrets
```

Local equivalents live in `.dev.vars` (gitignored); see `.dev.vars.example`.

### 5. GitHub CI (manual / later `gh`)

Create GitHub Environments:

| Environment | Secrets | Protection |
|---|---|---|
| `cloud-dev` | `CLOUDFLARE_API_TOKEN` (Dev-scoped), `CLOUDFLARE_ACCOUNT_ID` | optional |
| `production` | Production-scoped token + account id | **required reviewers** |

Token scopes (minimum): edit the target Worker(s), D1/R2/Queues for that
account; zone/custom domain only where needed. No account-wide admin.

Workflows already in repo:

- `.github/workflows/ci.yml` — PR gate, no deploy
- `.github/workflows/deploy-dev.yml` — merge to `main`
- `.github/workflows/deploy-production.yml` — `workflow_dispatch` only

## Production — owner order (later)

Do **not** run until Cloud Dev deploy + smoke are green for a real commit.

1. Create `squad-me-production-db`, `-files`, `-jobs`, `-jobs-dlq`.
2. Put real `database_id` into `wrangler.jsonc` → `env.production`.
3. Backup policy ready → `wrangler d1 migrations apply DB --remote --env production`.
4. Custom domain `squadme.app`, TLS, security headers.
5. `wrangler secret put … --env production`.
6. GitHub Environment `production` with required reviewers.
7. First ship only via **Deploy Production** workflow after Dev gate.

## Isolation rules

- Never point Dev/local Workers at production bindings.
- Never copy production PII into Dev.
- Reset/seed only for Dev: `npm run seed:dev` / `npm run seed:local`.
- Deploy CI fails when `database_id` is still `PROVISION_REQUIRED`
  (`node scripts/parity-check.mjs --strict`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `command not found: wrangler` | Use `npx wrangler` or npm scripts |
| R2 API `10042` | Enable R2 in Dashboard, re-run `npm run provision:dev` |
| `PROVISION_REQUIRED` in parity `--strict` | Provision did not finish; re-run script |
| Custom domain pending | Zone/DNS not on this account yet; deploy Worker first, attach domain when DNS is ready |
| Smoke 403 from browser | Cloudflare Access blocking; use allowed identity |
