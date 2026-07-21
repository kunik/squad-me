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

## Local API tokens (`.env.cloudflare`)

Dashboard API scripts (Access, apex DNS attach, wiring GitHub secrets) read
tokens from a **gitignored** file at the repo root — not from chat and not by
agents opening the file.

```bash
cp .env.cloudflare.example .env.cloudflare
# edit .env.cloudflare locally (never commit)
```

| Variable | Used for |
|---|---|
| `CLOUDFLARE_API_TOKEN_DNS` | `npm run attach:production:hostname` (Zone DNS Edit + Workers Scripts Edit) |
| `CLOUDFLARE_API_TOKEN_ACCESS` | `npm run provision:access:dev` / `provision:access:smoke:dev` |
| `CLOUDFLARE_API_TOKEN` | Fallback for the above; also `npm run ci:wire-secrets` (CI deploy token) |
| `CLOUDFLARE_ACCOUNT_ID` | Optional override (public default is already in docs) |

`scripts/infra-setup/lib/common.sh` loads `.env.cloudflare` when present (does not
print values). Shell-exported env still wins over the file. Keep token scopes
separated: Access-only token ≠ CI deploy token ≠ DNS attach token.
`require_wrangler_auth` (used by `provision:dev` / `provision:production`) also
loads the file first so `CLOUDFLARE_API_TOKEN` there can satisfy wrangler without
a prior `wrangler login`.

**Sanity check:** `npm run infra:doctor` reports which token roles are set
(booleans only), `wrangler whoami`, and probes DNS / Workers domains (or scripts)
/ Access when those tokens (or the generic fallback) are present. Missing
optional tokens → warn + skip; set-but-rejected → exit non-zero. Never prints
secret values. Account/zone IDs from `.env.cloudflare` override script defaults.

**Agent rule:** run `npm run …` / infra scripts so the file is sourced; do **not**
Read/cat `.env.cloudflare` to extract secrets.

## One-time infra setup (`scripts/infra-setup/`)

Bootstrap scripts that create or attach Cloudflare resources live in
`scripts/infra-setup/` and are run via npm (idempotent; owner/local, not PR CI).
See `scripts/infra-setup/README.md`. Ongoing helpers (seed, smoke, parity) stay
alongside them under `scripts/` (see `scripts/README.md`).

| npm script | Script | Why |
|---|---|---|
| `npm run provision:dev` | `scripts/infra-setup/provision.sh dev` | Shared bootstrap: Dev D1/R2/queues, `database_id`, migrate, inventory rows |
| `npm run provision:production` | `scripts/infra-setup/provision.sh production` | Same shared bootstrap for Production |
| `npm run provision:access:dev` | `scripts/infra-setup/provision-access-dev.sh` | Access app for `dev.squadme.app` (Access API token; separate auth surface) |
| `npm run provision:access:smoke:dev` | `scripts/infra-setup/provision-access-smoke-dev.sh` | Access service token + Service Auth policy for GHA/local smoke |
| `npm run attach:production:hostname` | `scripts/infra-setup/attach-production-hostname.sh` | Clear conflicting apex DNS + attach `squadme.app` (needs `CLOUDFLARE_API_TOKEN_DNS` in `.env.cloudflare`) |
| `npm run infra:doctor` | `scripts/infra-setup/doctor.sh` | Local auth sanity check: token roles set?, wrangler login, DNS/Workers/Access probes (no secrets in output) |
| `npm run ci:wire-secrets` | `scripts/infra-setup/wire-github-ci-secrets.sh` | Set `cloud-dev` GitHub secrets from `.env.cloudflare` / env (not production deploy token) |

## What is scripted vs manual

| Step | How |
|---|---|
| Cloudflare login | Manual once: `npx wrangler login` |
| Enable R2 on the account | **Manual** — [R2 Overview](https://dash.cloudflare.com/?to=/:account/r2/overview) (purchase/enable if prompted) |
| D1 + R2 bucket + Queue/DLQ + migrations + `database_id` + inventory | **Script:** `npm run provision:dev` / `npm run provision:production` |
| First Worker deploy + smoke | **Script:** `npm run deploy:dev` then `npm run smoke:dev`; Production: `npm run deploy:production` |
| Zone DNS / Worker custom domains | Zone already on account (see below). Dev: `npm run deploy:dev` attaches `dev.squadme.app`. Production apex: attached; recover conflicts with `npm run attach:production:hostname` + DNS token in `.env.cloudflare` |
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
# .env.cloudflare → CLOUDFLARE_API_TOKEN_ACCESS=...  (Access scopes)
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
# .env.cloudflare → CLOUDFLARE_API_TOKEN_ACCESS=...  (Apps/Policies + Service Tokens Edit)
npm run provision:access:smoke:dev
# save CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET (secret shown once)
# optional: put the pair in .env.cloudflare for local smoke / ci:wire-secrets
npm run smoke:dev                 # local verify (with CF_ACCESS_* in env)
```

Creates token `squad-me-gha-smoke` and policy `Allow CI smoke` (`non_identity`)
on app `squad-me-dev`. Wire the pair into GitHub Environment `cloud-dev` via
`npm run ci:wire-secrets` (or `gh secret set`).

### 4. Secrets (semi-scripted)

When identity/session/notification test keys exist:

```bash
npx wrangler secret put SESSION_SIGNING_KEY --env dev
# …other Dev-only secrets — see "Identity / auth secrets" below
```

Local equivalents live in `.dev.vars` (gitignored); see `.dev.vars.example`.

### 5. GitHub CI

GitHub Environments on `kunik/squad-me` (**created** via `gh`):

| Environment | Secrets | Protection |
|---|---|---|
| `cloud-dev` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (`squad-me-ci-dev`), `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` (**all set**; Deploy Cloud Dev green) | none |
| `production` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (`squad-me-ci-prod`) (**both set**) | none (manual `workflow_dispatch` only) |

Wrangler OAuth **cannot** create Account API tokens or Access resources. Dev
deploy token lives in Environment `cloud-dev` (not repo-level secrets).

**Dev token `squad-me-ci-dev` — required permissions**

Account **Taras**:

- Workers Scripts — Edit
- D1 — Edit
- Workers R2 Storage — Edit
- Queues — Edit
- Account Settings — Read (optional but helpful)

Zone **squadme.app** (required for `wrangler deploy` with custom domains):

- Workers Routes — Edit

Without Zone → Workers Routes → Edit, deploy fails with auth `10000` on
`/zones/.../workers/routes` (seen in GHA after token was first wired).

For Access smoke bootstrap (API), also add:

- Access: Apps and Policies — Edit
- Access: Service Tokens — Edit

Or create the service token in Zero Trust UI and only wire GitHub secrets.

User → User Details → Read removes the wrangler “Unable to retrieve email” warning.

[API Tokens](https://dash.cloudflare.com/profile/api-tokens) → edit `squad-me-ci-dev`
→ add missing scopes → (value unchanged if only permissions/rename; regenerating
creates a new secret string that must be re-wired to GitHub).

**Wire Access smoke secrets** (after token has Access scopes):

```bash
printf '%s' "$(gh auth token)" | gh secret set TEMP_GH_TOKEN --repo kunik/squad-me --env cloud-dev
gh workflow run "Provision Access smoke secrets" --repo kunik/squad-me
# wait for green, then:
gh secret delete TEMP_GH_TOKEN --repo kunik/squad-me --env cloud-dev
```

Local alternative: `npm run provision:access:smoke:dev` then `npm run ci:wire-secrets`
with `CF_ACCESS_CLIENT_*` exported.

Do **not** reuse `squad-me-ci-dev` for Production; use separate Production-scoped
token `squad-me-ci-prod` in Environment `production` (already wired for
`deploy-production.yml`).

Workflows:

- `.github/workflows/ci.yml` — PR gate, no deploy
- `.github/workflows/deploy-dev.yml` — merge to `main` (smoke uses Access service token secrets)
- `.github/workflows/deploy-production.yml` — `workflow_dispatch` only (optional `commit_sha`; default `main` tip)
- `.github/workflows/provision-access-smoke.yml` — one-shot Access smoke secret bootstrap

## Identity / auth secrets (docs/plans/auth-registration-plan.md)

> **Before first OTP deploy to Dev/Prod** — Turnstile keys, Twilio Verify trio
> (still Pending), and Gateway+Twilio budget alerts. Mirror checklist:
> `docs/deployment.md` § "Before first identity/OTP deploy" and
> `.agents/notes.md`. Do not deploy OTP-capable code until those are done (or
> the owner accepts fail-closed OTP / missing fallback).

Phase 1–4 of the auth/registration plan are implemented in code
(`src/worker/identity/` + client auth UI). Locally and in CI/tests, OTP is
gated entirely by `OTP_SINK_MODE=log` (fake provider only — zero real
Gateway/Twilio calls) and Turnstile uses the intentional Noop verifier.
In Dev/Production, `OTP_SINK_MODE` must stay **absent** so live providers run;
**without** `TURNSTILE_SECRET_KEY` in that mode, `otp/start` returns
`turnstile_misconfigured` (503) and does **not** call Gateway/Twilio (fail
closed). Twilio Verify credentials are still **Pending** (fallback path is
already coded in `src/worker/identity/otp/index.ts` — Gateway first, then
Twilio when all three Twilio secrets are set). Turnstile client/server wiring
is implemented: `GET /api/auth/config` exposes only the public site key, the
register/reset forms render the widget, and `otp/start` runs siteverify before
any provider spend when the secret is present.
`TELEGRAM_GATEWAY_TOKEN` is already live in both Dev and Production (verified
via `wrangler secret list --env <env>` on 2026-07-18).

### Secrets checklist (before any public OTP traffic)

| Secret | Required for | Status |
|---|---|---|
| `SESSION_SIGNING_KEY` | Session-token/IP hashing pepper (all envs) | **Set** — already provisioned |
| `OTP_SINK_MODE` | `log` forces the fake OTP provider | **Local/CI only** (`.dev.vars` → `log`). Confirmed **absent** (no binding) in Dev and Production — do not set it there |
| `TELEGRAM_GATEWAY_TOKEN` | Telegram Gateway (https://gateway.telegram.org/) — primary OTP channel | **Set** — live in both Dev and Production |
| `TWILIO_ACCOUNT_SID` | Twilio Verify fallback (with Auth Token + Verify SID) | **Pending** — create Verify Service; put all three before relying on fallback |
| `TWILIO_AUTH_TOKEN` | Twilio Verify fallback | **Pending** |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify fallback (`VA…`) | **Pending** |
| `TURNSTILE_SECRET_KEY` | Server-only siteverify for `otp/start` | **Pending** — create widget (steps below). Live OTP **refuses** without it |
| `TURNSTILE_SITE_KEY` | Public widget key (`GET /api/auth/config`) | **Pending** — must match the secret's widget |

Apply with (Dev shown; swap `--env production` for Production — only after
values are confirmed):

```bash
# Twilio Verify fallback (all three required for the code path to select Twilio)
npx wrangler secret put TWILIO_ACCOUNT_SID --env dev
npx wrangler secret put TWILIO_AUTH_TOKEN --env dev
npx wrangler secret put TWILIO_VERIFY_SERVICE_SID --env dev

# Turnstile (after widget create — see steps below)
npx wrangler secret put TURNSTILE_SECRET_KEY --env dev
# Site key is public; secret put is fine and matches current workflow.
npx wrangler secret put TURNSTILE_SITE_KEY --env dev
```

Never set `OTP_SINK_MODE` in Dev/Prod — its mere presence adds a confusing
binding for no behavioral gain; real-provider selection already happens when
it's absent. If it's ever accidentally set, remove it with
`npx wrangler secret delete OTP_SINK_MODE --env <env>`.

Local dev/tests always use `.dev.vars` → `OTP_SINK_MODE=log` (see
`.dev.vars.example`); never put real provider credentials there unless you
are deliberately exercising live OTP locally (and then Turnstile secret is
mandatory).

### Turnstile widget (owner — keys not created in this change)

Wrangler OAuth on this account can list/create widgets (`npx wrangler turnstile
widget …`, Wrangler 4.109+). There is no dedicated npm script yet (one-shot
owner action). Dashboard alternative: Cloudflare → Turnstile → Add widget.

**Create (recommended one managed widget for all hostnames):**

```bash
npx wrangler turnstile widget create "squad-me-otp" \
  --domain localhost \
  --domain 127.0.0.1 \
  --domain dev.squadme.app \
  --domain squadme.app \
  --mode managed \
  --json
```

Capture `sitekey` + `secret` from JSON (secret is shown once). Then:

```bash
# Dev
printf '%s' '<secret>' | npx wrangler secret put TURNSTILE_SECRET_KEY --env dev
printf '%s' '<sitekey>' | npx wrangler secret put TURNSTILE_SITE_KEY --env dev

# Production (only when ready)
printf '%s' '<secret>' | npx wrangler secret put TURNSTILE_SECRET_KEY --env production
printf '%s' '<sitekey>' | npx wrangler secret put TURNSTILE_SITE_KEY --env production
```

Optional local widget smoke (still keep `OTP_SINK_MODE=log` unless intentionally
testing live send): set both keys in gitignored `.dev.vars`.

Token note: generic `CLOUDFLARE_API_TOKEN` with `Account.Turnstile:Edit` is
**not** required when using logged-in `wrangler turnstile` OAuth. Access/DNS
tokens in `.env.cloudflare` do not cover Turnstile API scripts.

### Twilio Verify fallback (code path)

`selectOtpProvider` (`src/worker/identity/otp/index.ts`):

1. `OTP_SINK_MODE=log` → fake (local/CI)
2. else if `TELEGRAM_GATEWAY_TOKEN` → Gateway (primary)
3. else if all of `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` /
   `TWILIO_VERIFY_SERVICE_SID` → Twilio Verify
4. else → throw (misconfigured)

Twilio is the **secondary provider when Gateway has no token**, not an automatic
retry after a Gateway send failure. Put all three Twilio secrets before
expecting SMS when Gateway is unavailable/unconfigured. Do not invent or
commit credentials.

### Budget alerts (before raising OTP traffic)

No in-app spend cap yet. Enable provider-side alerts **before** public OTP:

| Channel | Where | What to enable |
|---|---|---|
| Telegram Gateway | [gateway.telegram.org](https://gateway.telegram.org/) account / billing UI | Spend or balance alerts / low-balance notification if offered; note monthly cap mentally |
| Twilio | Console → **Billing** → **Usage triggers** (or Monitor → Alerts) | Usage trigger on Verify / SMS spend (e.g. daily or monthly threshold + email) |
| Cloudflare | Dashboard notifications (account) | Optional: Workers error-rate / spend alerts when Paid billing is on — does **not** replace Gateway/Twilio alerts |

### Manual steps still owed (Phase 0 — owner dashboard / wrangler)

1. ~~Telegram Gateway account~~ — **done**; `TELEGRAM_GATEWAY_TOKEN` is live in
   Dev and Production.
2. **Twilio account + Verify service** — create a Verify Service, collect
   Account SID / Auth Token / Verify Service SID; `wrangler secret put` all three
   (Dev then Production).
3. **Turnstile widget** — create via `wrangler turnstile widget create` (or
   dashboard); put `TURNSTILE_SECRET_KEY` + `TURNSTILE_SITE_KEY` on Dev (then
   Production). Until then, live `otp/start` fail-closes.
4. **Budget alerts** — checklist above (Gateway + Twilio usage triggers).
5. Keep `OTP_SINK_MODE` unset in Dev/Prod (already true).
6. **scrypt CPU-time** — local sample: `npm run bench:scrypt` (params
   `N=2^15, r=8, p=1`). Guidance: local Node mean hash ideally &lt;150ms; do
   **not** raise `N` without measuring. Confirm on deployed Workers against the
   plan CPU budget before raising traffic (fallback: WebCrypto PBKDF2-SHA-256
   ≥600k iterations). Open: legal retention policy text still owed separately.

### Fail-closed OTP / Turnstile matrix

| `OTP_SINK_MODE` | `TURNSTILE_SECRET_KEY` | `otp/start` behavior |
|---|---|---|
| `log` | unset | Noop Turnstile + fake OTP (local/CI) |
| `log` | set | Real siteverify + fake OTP |
| unset (live) | set | Real siteverify + Gateway/Twilio |
| unset (live) | unset | **503 `turnstile_misconfigured`** — no provider call |

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
# .env.cloudflare → CLOUDFLARE_API_TOKEN_DNS=...  (Zone DNS Edit + Workers Scripts Edit)
# Recommended token name: squad-me-dns (do not reuse Access-only or CI tokens)
npm run attach:production:hostname
```

Clears conflicting A/AAAA/CNAME for exact name `squadme.app` (keeps TXT/MX),
then attaches the Worker custom domain via the Cloudflare API. Loads tokens from
`.env.cloudflare` automatically. Dry-run (list planned deletes only):
`ATTACH_DRY_RUN=1 npm run attach:production:hostname`. Soft-fail HTTPS health
during a deploy window: `ATTACH_SKIP_HEALTH=1 npm run attach:production:hostname`.

**One-off alternative (documented):** [DNS for squadme.app](https://dash.cloudflare.com/2758c21b02e5c7efcfa745cb49948ace/squadme.app/dns/records)
→ delete A/AAAA/CNAME for exact name `squadme.app` (keep SPF TXT / MX) →
`npm run deploy:production`.

Verify: `https://squadme.app` serves the unauthenticated home page;
`https://squadme.app/api/health` → `environment=production`. Production is
**public** for the landing surface (no Access). Do not weaken Access on Dev.

### 4. Secrets + GitHub (still open)

```bash
npx wrangler secret put SESSION_SIGNING_KEY --env production
# …other Production secrets when ready
```

GitHub Environment `production` holds `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN` (`squad-me-ci-prod`); **no** required reviewers —
Production ships only via **Deploy Production** (`workflow_dispatch`): empty
optional `commit_sha` → latest `main`; otherwise resolve short/full SHA via
API then checkout the full commit. Owner can still deploy locally as above
when needed.

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
(attached). Production Worker `squad-me-production-app` has custom domain
`squadme.app` attached (verified 2026-07-18: `/api/health` →
`environment=production`). If attach regresses with API **100117**, put a DNS
token in `.env.cloudflare` and re-run `npm run attach:production:hostname`
(see § Production step 3).

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
| Apex DNS delete `1043` / AAAA `100::` | Cloudflare-managed read-only record (Workers already owns the apex). Attach script skips it and verifies Workers domain + `https://squadme.app/api/health`. Not a failure if the domain is already attached. |
| Attach script when apex already live | Idempotent: skip 1043, confirm Workers custom domain mapping, HTTPS health. Use `ATTACH_DRY_RUN=1` to list planned deletes without mutating. Use `ATTACH_SKIP_HEALTH=1` to soft-fail non-200 HTTPS during a deploy window. |
| CPU limits Free plan `100328` | Omit `limits.cpu_ms` (both envs) or enable Workers Paid |
| Missing `workers.dev` subdomain `10063` | Open Workers & Pages once, or `PUT /accounts/:id/workers/subdomain` with `{"subdomain":"…"}` |
| Smoke 302/403 on Dev | Access blocking; browser: allowed email. CI/local automation: `CF_ACCESS_CLIENT_ID` + `CF_ACCESS_CLIENT_SECRET` (`provision-access-smoke.yml` or `npm run provision:access:smoke:dev`) |
| GHA deploy auth `10000` on `/zones/.../workers/routes` | Edit `squad-me-ci-dev`: Zone `squadme.app` → **Workers Routes → Edit** (Account-level Workers Routes is not enough) |
| Apex returns 522 before attach | Proxied leftover DNS with dead origin; clear conflicts and attach Worker domain |
