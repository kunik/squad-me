# Auth/registration implementation (Phase 1–4 + Phase 5 stubs)

**Date:** 2026-07-18 21:52

## Summary

Implemented `docs/plans/auth-registration-plan.md` Phase 1 through Phase 4 in
full, plus the Phase 5 stub tables (no send pipeline), without any live
Telegram Gateway / Twilio / Turnstile accounts. New `src/worker/identity/`
module: scrypt password hashing, opaque-cookie sessions, UA-first phone
normalization, D1-backed OTP challenges + phone proofs with exact rate limits
from the plan, D1-backed login lockout (per-account and per-IP), a pluggable
Turnstile hook (dev-bypass no-op today), and all eight `/api/auth/*` routes.
Client got a real `LoginPage`, a `RegisterPage` wizard (phone → OTP →
password), a `ForgotPasswordPage` wizard, a session-aware `PublicHeader`, and
new UA/EN i18n strings. `migrations/0002_identity.sql` adds `accounts`,
`sessions`, `auth_challenges`, `phone_proofs`, `auth_rate_limits`, and the
Phase 5 stub tables `account_telegram_links` / `push_subscriptions`.

## Key decisions

- **OTP verification design:** the Worker generates the 6-digit code itself
  (`otp/index.ts`), hashes it into `auth_challenges.code_hash`, and asks the
  provider to *deliver* that code (`OtpProvider.send`). Both Telegram
  Gateway's `sendVerificationMessage` and Twilio Verify's custom-code option
  support this, so local hash comparison stays authoritative and the fake
  provider needs no shared state with the verify path. `OtpProvider.check` is
  kept on the interface (per the plan) as a best-effort remote-confirmation
  hook for the real adapters, but the local hash check is what actually gates
  success.
- **Rate limiting split:** OTP resend-cooldown and per-phone/per-IP send
  counts are answered by querying `auth_challenges` directly (the
  `(phone_e164, purpose, created_at)` and `(ip_hash, created_at)` indexes) —
  no separate counter table needed there. `auth_rate_limits` is used only for
  login lockout (`login_account` / `login_ip` scopes), since that needs a
  persistent rolling-window failure counter rather than a per-event log.
- **Login lockout vs. no-enumeration tension:** accepted a known minor
  trade-off — an existing-but-locked account returns `429` while an
  unknown/not-locked phone returns `401`, which differs by status code. Full
  indistinguishability was judged not worth the complexity for v1; a dummy
  scrypt hash is computed for unknown accounts so *timing* doesn't leak
  existence on the primary wrong-password path.
- **Session cookie `Secure` flag** is only omitted when `ENVIRONMENT ===
  "local"` (plain `http://localhost`); Dev and Production always get
  `Secure` per the plan's hard rule.
- **Turnstile**: implemented as a `TurnstileVerifier` interface with a
  `NoopTurnstileVerifier` default (used whenever `TURNSTILE_SECRET_KEY` is
  unset) and a `CloudflareTurnstileVerifier` real implementation that fails
  closed on network/parse errors. No real widget/keys were created — that is
  explicitly a pending manual step.
- **`IDENTITY_PROVIDER_SECRET`** removed from `.dev.vars.example` and
  `docs/provision.md` — confirmed dead (no code reference) before deleting.
- **Test schema bootstrap:** `@cloudflare/vitest-pool-workers` does not
  auto-apply `migrations/*.sql`, matching the existing
  `concurrency.test.ts` pattern. Added `src/worker/identity/test-support.ts`
  (`applyIdentitySchema` / `resetIdentityTables`) mirroring
  `migrations/0002_identity.sql` by hand; documented the convention (and the
  drift risk) in `docs/testing.md`.
- **`@noble/hashes@^2.2.0`** added as the scrypt implementation (pure JS,
  matches the plan's Workers-friendly requirement); params `N=2^15, r=8, p=1`
  exactly as the plan specifies, with a hard 128-char pre-hash length guard.

## Files changed

Backend (new):
- `migrations/0002_identity.sql`
- `src/worker/identity/{password,session,phone,rate-limit,turnstile,crypto,routes,test-support}.ts`
- `src/worker/identity/otp/{types,fake,gateway,twilio,index}.ts`
- Tests: `src/worker/identity/{password,phone,session,routes}.test.ts`, `src/worker/identity/otp/otp.test.ts`

Backend (modified):
- `src/worker/env.ts` — new secret/config fields
- `src/worker/index.ts` — mounts identity routes under `/api/auth/`, cron sweep calls `sweepExpiredOtp` + `sweepExpiredSessions`
- `.dev.vars.example` — removed dead `IDENTITY_PROVIDER_SECRET`, added OTP/Turnstile secrets (`OTP_SINK_MODE=log` default)
- `package.json` / `package-lock.json` — `@noble/hashes` dependency

Frontend (new):
- `src/client/auth.tsx` — `AuthProvider`/`useAuth` session context
- `src/client/lib/authApi.ts`, `src/client/lib/authErrors.ts`
- `src/client/components/OtpStep.tsx` — shared OTP step for register/forgot-password wizards
- `src/client/pages/RegisterPage.tsx`, `src/client/pages/ForgotPasswordPage.tsx`

Frontend (modified):
- `src/client/pages/LoginPage.tsx` — real phone+password form, safe `next` redirect
- `src/client/components/PublicHeader.tsx` — session-aware (Log in vs phone + Log out)
- `src/client/App.tsx` — `/register`, `/forgot-password` routes
- `src/client/main.tsx` — wraps app in `AuthProvider`
- `src/client/i18n.ts` — new UA/EN auth strings
- `src/client/styles.css` — `.auth-page` / `.auth-form` / `.public-header__account` styles; removed dead `.login-placeholder`

Docs:
- `docs/provision.md` — new "Identity / auth secrets" section (checklist + pending manual steps)
- `docs/testing.md` — D1 schema-bootstrap convention for vitest-pool-workers, OTP fake-provider testing note
- `docs/plans/auth-registration-plan.md` — status line updated to reflect Phase 1–4 + Phase 5 stubs implemented, Phase 0 pending

## Verification

- `npm run typecheck` — pass (all 3 tsc projects)
- `npm run build` — pass (worker bundle + client bundle)
- `npm test` — pass, 42/42 tests across 6 files (password round-trip/length guards, phone normalization edge cases, session create/verify/revoke incl. revoke-all-except-current, OTP start/verify happy path + cooldown/phone-limit/ip-limit/lockout boundaries via fake provider only, register unique-conflict 409 with no password overwrite, login generic-error for wrong-password vs unknown-account, password-reset and phone-change session revocation)
- `npm run migrations:local` — pass (`0001_init.sql` + `0002_identity.sql` both applied cleanly to local D1)
- UI smoke test: attempted via a browser subagent and via `curl` against the Vite dev server; both were blocked by this sandbox's network isolation (browser MCP rejected, `curl localhost` got connection-refused even against a confirmed-running dev server in a background shell). Did **not** get a live-rendered screenshot of `/login`, `/register`, or `/forgot-password`. Relying on `npm run typecheck` + `npm run build` (which catch JSX/type errors) as the primary check, per the task's stated fallback.

## Pending

- **Phase 0 (manual, owner dashboard action):** create Telegram Gateway account/token, Twilio account + Verify service, Turnstile widget (site + secret key); wire all via `wrangler secret put ... --env dev|production` per `docs/provision.md` § "Identity / auth secrets".
- **Budget alert** on Telegram Gateway / Twilio spend — no in-app cap yet; must be set up in each provider's dashboard before raising OTP traffic.
- **scrypt CPU-time benchmark on deployed Workers** — not possible in this sandbox (no deploy access); params ship as the plan's stated starting point (`N=2^15, r=8, p=1`, ~32 MiB peak memory). Confirm against the real Workers CPU budget before raising traffic; fallback documented in the plan is WebCrypto PBKDF2-SHA-256 ≥600k iterations.
- **Turnstile is not actually enforced yet** — `otp/start` currently always passes the dev-bypass no-op verifier since no secret key is configured anywhere. This is a real gap for public launch (cost-abuse vector), tracked in `docs/provision.md`.
- Browser-based manual smoke test of the new UI routes (`/login`, `/register`, `/forgot-password`, header logged-in state) is still owed — blocked by sandbox network isolation this session, not by any known code issue.
- Nothing was committed — all changes are staged/unstaged in the working tree per instructions.
