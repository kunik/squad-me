# Testing

Two tiers. Local covers everything deterministic on `workerd`/SQLite. Cloud Dev
covers Cloudflare edge/lifecycle behavior that cannot be simulated locally.

Canonical product rationale: knowledge-base
`products/match-platform/specs/deployment.md`.

## Commands

| Command | When |
|---|---|
| `npm run dev` | Inner loop — full local simulation (D1/DO/Queues/R2) |
| `npm run typecheck` | Fast static check |
| `npm test` | Unit + `@cloudflare/vitest-pool-workers` concurrency |
| `npm run migrations:local` | Apply D1 migrations to the **top-level** local DB — the same Miniflare local D1 that plain `npm run dev` / `npm run build` use (no `--env`). Run this after every new migration, before `npm run dev`, or you'll hit `no such table` |
| `npm run build` | Build with local/top-level Wrangler config |
| `npm run parity:check` | Dev/Prod Wrangler shape parity |
| `npm run smoke:dev` | Against `https://dev.squadme.app` after deploy (needs Access service token env vars when Access is on) |

## Tier 1 — local (PR gate)

Runs in GitHub Actions `ci.yml` on every PR. **No deployment.**

- lint / format (when ESLint lands)
- TypeScript typecheck
- unit tests for domain/application (ports mocked)
- application command/query and authz-policy tests
- D1 migrations from scratch (+ upgrade from previous schema when present)
- repository contract tests against local D1 adapter
- concurrency via `@cloudflare/vitest-pool-workers`: N parallel claims → one success
  (`src/worker/concurrency.test.ts` scaffold)
- identity/auth unit + integration tests (`src/worker/identity/**/*.test.ts`):
  password hash/verify, session lifecycle, phone normalization, OTP
  start/verify + rate-limit/lockout boundaries (fake provider only — see
  below), register/login/reset/phone-change route behavior
- auth/profile regression contracts, including `AUTH-001`: register-as-reset
  preserves all existing profile fields and `profile_completed_at` while
  nickname-on-register (`POST /api/auth/register` with `nickname`) / a
  sectional nickname upsert changes only `nickname`
- aggregate profile section contracts: `section: "profile"` preserves all
  divisions, while `section: "disciplines"` preserves identity/membership
  fields and does not alter `profile_completed_at` (but stamps
  `disciplines_prompt_dismissed_at` for the disciplines onboarding step)
- client profile/onboarding UI contracts:
  `src/client/components/PublicChrome.test.ts` (fixed `.app-top-chrome` +
  hint slot hosting `HintPanel` / «панель підказки»),
  `src/client/components/HintPanel.test.ts` (shared hint panel + optional Skip),
  `src/client/components/ProfileControls.test.ts` (no onboarding-only Skip
  inside forms),   `src/client/lib/profileNavigation.test.ts` (`PROFILE-001`
  anchors/scroll-spy including `scrollY = 0` → «Мій профіль»; `PROFILE-002`
  step-advance anchors `my-divisions` then `my-notifications` + window-only
  scroll offset so Skip/Save menu navigation cannot clip PublicHeader via
  `scrollIntoView` on `.public-surface`; `PROFILE-003` fixed-chrome menu
  click offset; `PROFILE-004` single near-chrome spy reading line + classic
  last-crossed-top selection so Divisions is not skipped),
  `src/client/components/PublicAtmosphere.test.ts` (`PROFILE-005` wash/hex
  siblings outside `.public-surface` so expanding panels cannot reflow the
  viewport-fixed atmosphere)
- account-deletion contract: atomic removal of login/session/contact/notification
  data; profile/account PII tombstoning; invalidation of the deleting session;
  unauthenticated and cross-origin rejection; same-phone fresh registration;
  and FK-backed fixtures proving both active and historical registration
  status/snapshots survive unchanged
- DO command-serialization and idempotency in local `workerd`
- Queue/outbox/idempotency handler logic on local simulation
- frontend unit + Playwright critical-path against `vite dev` (when e2e suite lands)
- build + Wrangler config validation / parity shape check

## Tier 2 — Cloud Dev (required before Production)

Runs in `deploy-dev.yml` after merge to `main`. Target: `dev.squadme.app`.

- WebSocket Hibernation and wake-from-D1
- deploy-disconnect → reconnect with backoff / `last_seen_revision`
- DO alarm timing and reservation/payment expiry
- Queue at-least-once, retries, DLQ
- cron triggers
- edge routing, custom domain, TLS/HTTP-3, security headers
- remote D1 migration apply + verification queries
- R2 authorized put/get/delete
- Cloudflare Access in front of the host
- full integration smoke; load rehearsal for registration-window releases
- observability pipeline sanity

Current smoke entrypoint: `scripts/smoke-cloud-dev.ts` (health, D1, DO ping).
When Access protects Dev, set `CF_ACCESS_CLIENT_ID` and
`CF_ACCESS_CLIENT_SECRET` (from `npm run provision:access:smoke:dev`). Expand
as domain features land.

## Overlap

Auth, D1 read/write, atomic slot claim, and WebSocket connect/revision run in
**both** tiers: locally for speed, in Cloud Dev for real edge/runtime proof.

Smoke never mutates real registrations or sends real notifications. Dev data is
synthetic only.

## Remote bindings (opt-in)

Default inner loop has **no** `remote: true`. To debug against a real Dev
resource, add `remote: true` on that single binding in `wrangler.jsonc`, run
`npm run dev`, then remove it. Do not commit remote bindings as the default.

## D1 schema in `@cloudflare/vitest-pool-workers`

Migrations under `migrations/*.sql` are **not** auto-applied to the pool's D1
instance (`npm run migrations:local` is a separate CI step, run after `npm
test`). Tests that need tables call an explicit schema-bootstrap helper
instead — see `src/worker/concurrency.test.ts` (ad-hoc `CREATE TABLE IF NOT
EXISTS`) and `src/worker/identity/test-support.ts`
(`applyIdentitySchema`/`resetIdentityTables`, mirrors the current cumulative
shape through `migrations/0009_account_deletion.sql`, including Account/Profile
tombstone columns and nullable profile ownership). Keep any such helper in sync with its
migration by hand; there is no automatic drift check yet.

## OTP provider in tests / local dev

`OTP_SINK_MODE=log` (set in `.dev.vars.example` and forced in
`src/worker/identity/test-support.ts#testEnv`) always selects the fake OTP
provider (`src/worker/identity/otp/fake.ts`), which logs the code instead of
sending it. Tests recover the code from the log line (see
`startAndCaptureCode` / `getProof` helpers in the identity test files) via a
`console.log` spy — never wire real `TELEGRAM_GATEWAY_TOKEN` /
`TWILIO_ACCOUNT_SID` credentials into `.dev.vars` or CI.
Turnstile keys are also unset in tests, selecting the intentional no-op
verifier; no test calls Cloudflare siteverify.

## Client unit tests vs worker test tsconfig

Client `*.test.ts` files under `src/client/` (PublicChrome, HintPanel, ProfileControls,
profile navigation) are typechecked by `tsconfig.json` (JSX enabled).
`tsconfig.test.json` is the Workers/vitest-pool config and **excludes**
`src/client/**` so it does not resolve `.tsx` imports without JSX.

## Flaky tests

- `vitest.config.ts` sets a 20s `testTimeout` (vitest default is 5s) —
  identity tests that register/login multiple accounts do several scrypt
  hashes each and can brush against the default under load. Real hangs still
  fail well before any human notices.
- Prefer deterministic clocks in local tests.
- Cloud Dev smokes that depend on alarm/queue timing should retry with bounded
  backoff and clear failure messages.
- Do not weaken concurrency assertions to silence flakes.
