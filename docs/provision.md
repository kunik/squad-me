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

## One-time infra setup (`infra-setup/`)

Bootstrap scripts that create or attach Cloudflare resources live in
`infra-setup/` and are run via npm (idempotent; owner/local, not PR CI).
Ongoing helpers (seed, smoke, parity) stay in `scripts/`.

| npm script | Script | Why |
|---|---|---|
| `npm run provision:dev` | `infra-setup/provision.sh dev` | Create Dev D1/R2/queues, write `database_id`, migrate, inventory |
| `npm run provision:access:dev` | `infra-setup/provision-access-dev.sh` | Create/update Access app for `dev.squadme.app` (needs Access API token) |
| `npm run provision:access:smoke:dev` | `infra-setup/provision-access-smoke-dev.sh` | Access service token + Service Auth policy for GHA/local smoke |
| `npm run provision:production` | `infra-setup/provision.sh production` | Same bootstrap for Production resources |
| `npm run attach:production:hostname` | `infra-setup/attach-production-hostname.sh` | Clear conflicting apex DNS + attach `squadme.app` (needs Zone DNS Edit token) |
| `npm run ci:wire-secrets` | `infra-setup/wire-github-ci-secrets.sh` | Set `cloud-dev` GitHub secrets from exported tokens (not production deploy token) |

## What is scripted vs manual

| Step | How |
|---|---|
| Cloudflare login | Manual once: `npx wrangler login` |
| Enable R2 on the account | **Manual** — [R2 Overview](https://dash.cloudflare.com/?to=/:account/r2/overview) (purchase/enable if prompted) |
| D1 + R2 bucket + Queue/DLQ + migrations + `database_id` + inventory | **Script:** `npm run provision:dev` / `npm run provision:production` |
| First Worker deploy + smoke | **Script:** `npm run deploy:dev` then `npm run smoke:dev`; Production: `npm run deploy:production` |
| Zone DNS / Worker custom domains | Zone already on account (see below). Dev: `npm run deploy:dev` attaches `dev.squadme.app`. Production apex: see § Production (conflicting DNS → `npm run attach:production:hostname`) |
| Cloudflare Access on Dev | **Done** — app `squad-me-dev`; manage with `npm run provision:access:dev` |
| Worker secrets | Semi-scripted: `npx wrangler secret put <NAME> --env dev\|production` (you supply values) |
| GitHub Environments + tokens | Environments exist; wire Dev token via `npm run ci:wire-secrets` (see §5) |
| Production resources | **Script:** `npm run provision:production` (owner-only; never from PR CI) |

## Cloud Dev — full order

### 0. Prerequisites (manual)

1. `npx wrangler login` — confirm with `npx wrangler whoami`.
2. Enable **R2** on the account in the Dashboard. Until this is done,
   `wrangler r2 bucket create` fails with code `10042`.
3. Zone `squadme.app` is already on this account (active). Account also needs a
   `workers.dev` subdomain before the first Worker deploy (created once; see Zone
   facts below).

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
Custom domain `dev.squadme.app` is declared in `wrangler.jsonc`; deploy attaches
it (Cloudflare creates DNS + certificate). Do not pre-create a conflicting
CNAME for that hostname.

### 3. Protect Dev (Access) — done

**Live:** self-hosted Access app `squad-me-dev` on `dev.squadme.app` only
(not `*.dev.squadme.app`). Policy `Allow Dev operators` allows
`taras.kunch@gmail.com`. Team domain: `squad-me.cloudflareaccess.com`.
Anonymous requests get HTTP 302 → Access login (not a bare Worker 200).

Verified: unauthenticated `GET https://dev.squadme.app/api/health` → `302` +
`www-authenticate: Cloudflare-Access`; login page title includes app name
`squad-me-dev`. Well-known metadata: `protected: true`.

#### Manage / extend (script)

Wrangler OAuth **cannot** manage Access. Use an API token:

1. [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → Create Token
   with at least:
   - **Access: Apps and Policies** — Edit
   - **Access: Organizations, Identity Providers, and Groups** — Edit
2. Run:

```bash
export CLOUDFLARE_API_TOKEN=...
# optional: export ALLOW_EMAILS=taras.kunch@gmail.com,other@example.com
npm run provision:access:dev
```

Idempotent. Dashboard:
[Access applications](https://one.dash.cloudflare.com/2758c21b02e5c7efcfa745cb49948ace/access/apps).

Add more operators: edit policy `Allow Dev operators` in the dashboard, or
re-run with a broader `ALLOW_EMAILS` only after deleting/renaming the existing
policy name (script does not merge emails into an existing policy).

#### CI / automation smoke (Access service token)

Unauthenticated `npm run smoke:dev` gets **302** from Access. GitHub Actions
must use an Access service token:

```bash
export CLOUDFLARE_API_TOKEN=...   # Access: Apps and Policies Edit + Service Tokens Edit
npm run provision:access:smoke:dev
# save CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET (secret shown once)
export CF_ACCESS_CLIENT_ID=... CF_ACCESS_CLIENT_SECRET=...
npm run smoke:dev                 # local verify
```

Creates token `squad-me-gha-smoke` and policy `Allow CI smoke` (`non_identity`)
on app `squad-me-dev`. Wire the pair into GitHub Environment `cloud-dev` via
`npm run ci:wire-secrets` (or `gh secret set`).

### 4. Secrets (semi-scripted)

When identity/session/notification test keys exist:

```bash
npx wrangler secret put SESSION_SIGNING_KEY --env dev
npx wrangler secret put IDENTITY_PROVIDER_SECRET --env dev
# …other Dev-only secrets
```

Local equivalents live in `.dev.vars` (gitignored); see `.dev.vars.example`.

### 5. GitHub CI

GitHub Environments on `kunik/squad-me` (**created** via `gh`):

| Environment | Secrets | Protection |
|---|---|---|
| `cloud-dev` | `CLOUDFLARE_ACCOUNT_ID` (**set**); `CLOUDFLARE_API_TOKEN` (Dev — **pending**); `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` (**pending**) | none |
| `production` | `CLOUDFLARE_ACCOUNT_ID` (**set**); `CLOUDFLARE_API_TOKEN` (Production — **not set**; separate token) | **required reviewer:** `kunik` |

Wrangler OAuth **cannot** create Account API tokens or Access resources. Create
the Dev deploy token in the Dashboard, then wire:

```bash
export CLOUDFLARE_API_TOKEN=...          # Dev deploy scopes below
# optional after provision:access:smoke:dev:
export CF_ACCESS_CLIENT_ID=... CF_ACCESS_CLIENT_SECRET=...
npm run ci:wire-secrets
```

**Dev token permissions** (Account **Taras** only; name `Squad Me Cloud Dev CI`):

- Workers Scripts — Edit
- D1 — Edit
- Workers R2 Storage — Edit
- Queues — Edit
- Workers Routes — Edit
- Account Settings — Read

[Create Token](https://dash.cloudflare.com/profile/api-tokens) (Custom token).
Do **not** reuse this token for Production; create a separate Production-scoped
token when enabling `deploy-production.yml`.

Workflows:

- `.github/workflows/ci.yml` — PR gate, no deploy
- `.github/workflows/deploy-dev.yml` — merge to `main` (smoke uses Access service token secrets)
- `.github/workflows/deploy-production.yml` — `workflow_dispatch` only

## Production — owner order

Cloud Dev is live (`dev.squadme.app` + Access). Production bootstrap:

### 1. Provision resources (script) — done

```bash
npm run provision:production
```

Idempotent. Creates / reuses:

- D1 `squad-me-production-db` and writes `database_id` into `wrangler.jsonc` → `env.production`
- R2 `squad-me-production-files`
- Queue `squad-me-production-jobs` + DLQ `squad-me-production-jobs-dlq`
- Applies remote D1 migrations (`--env production`)
- Writes `docs/inventory-production.md`

Owner-only; never from PR CI. Free-plan note: `limits.cpu_ms` omitted on both
envs (API `100328`); re-add when Workers Paid is enabled.

### 2. Deploy Worker (script)

```bash
npm run deploy:production
```

Builds with `CLOUDFLARE_ENV=production` and runs `wrangler deploy`. Worker
`squad-me-production-app` uploads with production bindings. Custom domain
`squadme.app` is declared in `wrangler.jsonc`.

**Apex attach caveat:** first deploy can fail trigger attach with API **100117**
(`Hostname already has externally managed DNS records`) when leftover
A/AAAA/CNAME exist on the apex. Wrangler OAuth has `zone (read)` but **not**
Zone DNS Edit, so deploy cannot clear those records. Worker script itself may
still be uploaded successfully.

### 3. Attach apex custom domain

Prefer the script (needs a DNS-capable API token):

```bash
export CLOUDFLARE_API_TOKEN=...   # Zone DNS Edit + Workers Scripts Edit
npm run attach:production:hostname
```

Clears conflicting A/AAAA/CNAME for exact name `squadme.app` (keeps TXT/MX),
then attaches the Worker custom domain via the Cloudflare API.

**One-off alternative (documented):** [DNS for squadme.app](https://dash.cloudflare.com/2758c21b02e5c7efcfa745cb49948ace/squadme.app/dns/records)
→ delete A/AAAA/CNAME for exact name `squadme.app` (keep SPF TXT / MX) →
`npm run deploy:production`.

Verify: `https://squadme.app` serves the coming-soon stub;
`https://squadme.app/api/health` → `environment=production`. Production is
**public** for the stub (no Access). Do not weaken Access on Dev.

### 4. Secrets + GitHub (still open)

```bash
npx wrangler secret put SESSION_SIGNING_KEY --env production
# …other Production secrets when ready
```

GitHub Environment `production` exists with required reviewer `kunik` and
`CLOUDFLARE_ACCOUNT_ID`. Production `CLOUDFLARE_API_TOKEN` is intentionally
unset until a separate Production-scoped token is created. First automated ship
remains **Deploy Production** (`workflow_dispatch`) after Dev gate; until then
owner can deploy locally as above.

## Zone facts (`squadme.app`)

| Field | Value |
|---|---|
| Account | Taras (`2758c21b02e5c7efcfa745cb49948ace`) |
| Zone ID | `c224b051f2d19f3900b68c0d69ffb3c6` |
| Status | `active` (full setup; activated 2026-07-16) |
| Cloudflare NS | `barbara.ns.cloudflare.com`, `miguel.ns.cloudflare.com` |
| Public NS | Matches Cloudflare (registrar NS were Namecheap `dns*.registrar-servers.com`) |
| Original registrar | Namecheap Inc. |
| Plan | Free Website |
| `workers.dev` account subdomain | `squad-me` → `*.squad-me.workers.dev` (required once; Dev Worker uses custom domain only, `workers_dev: false`) |

Cloud Dev hostname: Worker custom domain `dev.squadme.app` on `squad-me-dev-app`
(attached). Production Worker `squad-me-production-app` is uploaded; apex
`squadme.app` attach depends on clearing conflicting DNS (see § Production).

Dashboard: [Workers & Pages](https://dash.cloudflare.com/2758c21b02e5c7efcfa745cb49948ace/workers-and-pages) ·
[DNS for squadme.app](https://dash.cloudflare.com/2758c21b02e5c7efcfa745cb49948ace/squadme.app/dns/records)

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
| Custom domain pending (Dev) | Confirm zone active + no conflicting CNAME; re-run `npm run deploy:dev` |
| Apex custom domain `100117` (Production) | Conflicting A/AAAA/CNAME on `squadme.app`. Run `npm run attach:production:hostname` (DNS-capable token) or delete those records in Dashboard DNS, then `npm run deploy:production` |
| CPU limits Free plan `100328` | Omit `limits.cpu_ms` (both envs) or enable Workers Paid |
| Missing `workers.dev` subdomain `10063` | Open Workers & Pages once, or `PUT /accounts/:id/workers/subdomain` with `{"subdomain":"…"}` |
| Smoke 302/403 on Dev | Access blocking; browser: allowed email. CI/local automation: `CF_ACCESS_CLIENT_ID` + `CF_ACCESS_CLIENT_SECRET` (`npm run provision:access:smoke:dev`) |
| Apex returns 522 before attach | Proxied leftover DNS with dead origin; clear conflicts and attach Worker domain |
