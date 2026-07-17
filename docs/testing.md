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
| `npm run migrations:local` | Apply D1 migrations to local DB |
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

## Flaky tests

- Prefer deterministic clocks in local tests.
- Cloud Dev smokes that depend on alarm/queue timing should retry with bounded
  backoff and clear failure messages.
- Do not weaken concurrency assertions to silence flakes.
