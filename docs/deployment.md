# Deployment

Two-tier delivery: local `workerd` inner loop → Cloud Dev parity → manual
Production deploy. Product canon:
`products/match-platform/specs/deployment.md` (Obsidian KB).

## Environments

| Tier | Worker | Hostname | Trigger |
|---|---|---|---|
| Local | `squad-me-local` (not deployed) | localhost | `npm run dev` |
| Cloud Dev | `squad-me-dev-app` | `dev.squadme.app` | merge to `main` |
| Production | `squad-me-production-app` | `squadme.app` (Worker custom domain; see inventory) | manual `workflow_dispatch` |

Logical bindings are identical everywhere: `DB`, `MATCHES`, `JOBS`, `FILES`.
Only resource IDs, hostnames, secrets, and sampling differ.

## Build once

1. `CLOUDFLARE_ENV=dev vite build` → `dist/` for Cloud Dev.
2. Same commit later: `CLOUDFLARE_ENV=production vite build` → Production.
3. Do **not** rebuild different source for Production; deploy the tested SHA
   (`main` tip by default, or an optional resolved commit — see below).

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

One-time bootstrap scripts live in `scripts/infra-setup/` (npm entry points
below; see `scripts/infra-setup/README.md`). Requires `wrangler login` (or a
Dev-scoped API token):

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
GitHub Environments exist (`cloud-dev`, `production`); Production has **no**
required reviewers — gate is manual `workflow_dispatch` only. Wire Dev deploy +
Access smoke secrets with `npm run ci:wire-secrets` (tokens from
`.env.cloudflare`; see `docs/provision.md`). Production API token
(`squad-me-ci-prod`) is on Environment `production`.

## Before first identity/OTP deploy

**Gate — do not merge/deploy auth OTP to Cloud Dev or Production until this is
done** (or the owner explicitly accepts fail-closed OTP / no Twilio fallback).
Full steps and secret status: `docs/provision.md` § "Identity / auth secrets".
Agent-facing checklist also in `.agents/notes.md`.

| Check | Why |
|---|---|
| **Turnstile** widget + `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` on the target env | Live mode (`OTP_SINK_MODE` absent) **refuses** `otp/start` with `turnstile_misconfigured` without the secret — no Gateway spend, but OTP is broken until keys exist |
| **Twilio Verify** trio (`TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VERIFY_SERVICE_SID`) | Gateway fallback still **Pending**; code selects Twilio only when all three are set |
| **Budget alerts** on Telegram Gateway + Twilio | No in-app spend cap — enable provider usage triggers before public OTP |
| Confirm `OTP_SINK_MODE` stays **unset** in Dev/Prod | Absence selects real Gateway; `TELEGRAM_GATEWAY_TOKEN` may already be live |

Local/CI keep `OTP_SINK_MODE=log` (fake OTP + Noop Turnstile). Do not create
or paste secrets in chat — use `wrangler secret put` / owner dashboards.

## CI/CD (GitHub Actions)

| Workflow | When | Deploys? |
|---|---|---|
| `ci.yml` | PR + push `main` | No |
| `deploy-dev.yml` | push `main` / manual | Cloud Dev |
| `deploy-production.yml` | `workflow_dispatch` only | Production |

GitHub Environments:

| Environment | Status |
|---|---|
| `cloud-dev` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (`squad-me-ci-dev`), `CF_ACCESS_CLIENT_*` set; Deploy Cloud Dev green (Access smoke) |
| `production` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (`squad-me-ci-prod`) set; **no** protection rules (manual workflow only) |

Cloud Dev smoke sends `CF-Access-Client-Id` / `CF-Access-Client-Secret` when
those environment secrets are present (`scripts/smoke-cloud-dev.ts`). Without
them, Access returns 302 and the deploy job fails.

Concurrency groups `cloud-dev` and `production` serialize deploys.

Workers Builds is **not** used.

## Production deploy

One human action: Actions → **Deploy Production** → Run workflow.

| `commit_sha` input | What deploys |
|---|---|
| Empty (default) | Latest **`main`** tip (always; ignore the branch picker in the UI for the deploy ref) |
| Set (short or full) | That commit, after API expand to a full 40-char SHA |

1. Prefer a SHA already deployed and smoked on Cloud Dev (usually `main` tip).
2. Job: resolve ref → checkout → D1 export backup → migrations → deploy
   `COMMIT_SHA` → health smoke.
3. Watch metrics 15–30 minutes for high-risk releases.

No Environment approval gate. Optional input `commit_sha` is expanded with
`gh api …/commits/{sha}` **before** `actions/checkout`. Never pass a short
SHA as checkout `ref` — GitHub treats it as a branch/tag name and fails
(`refs/heads/704ad14*`). Backup artifact names and `wrangler --var COMMIT_SHA`
use `git rev-parse HEAD` after checkout (not `github.sha` from the UI branch).

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
