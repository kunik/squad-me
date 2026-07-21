# 2026-07-21 · Auth OTP harden, notifications radios, deploy gate

## Summary

Hardened live OTP Turnstile (fail-closed without secret), centralized auth HTTP
error statuses, added guest/auth route guards, rebuilt `/profile` «Мої
сповіщення» as radio preference + connect panels, added local scrypt bench
script, and documented a mandatory pre-deploy OTP secrets gate for agents
(Turnstile, Twilio Verify, budget alerts). No deploy; no Turnstile/Twilio keys
created.

## Key decisions

- Live OTP (`OTP_SINK_MODE` absent): missing `TURNSTILE_SECRET_KEY` → 503
  `turnstile_misconfigured`, no Gateway/Twilio call. Noop Turnstile only when
  `OTP_SINK_MODE=log`.
- Canonical `AUTH_ERROR_STATUS` / `authError()` for identity routes; client
  maps `turnstile_misconfigured` (+ a few more codes) via i18n.
- `/login` `/register` `/forgot-password` = `RequireGuest`; `/profile` =
  `RequireAuth` (profile page no longer redirects itself).
- Notifications UX: three radios (email / Telegram / SMS) for preferred
  channel; status icon separate; disconnected icon expands connect shell.
  Email confirm + Telegram link remain stubs; SMS connected from auth phone;
  preference not persisted (default SMS).
- Deploy agents must see the OTP secrets gate in `.agents/notes.md`,
  `docs/deployment.md`, and `docs/provision.md` before first Dev/Prod OTP
  deploy. Gateway token may already be live; unset `OTP_SINK_MODE` selects it.

## Files changed

- Identity: `turnstile.ts`, `authHttp.ts`, `routes.ts`, `routes.test.ts`,
  `password.ts`, `env.ts`
- Client: `App.tsx` (guards), `ProfilePage.tsx`, `NotificationChannelsForm.tsx`,
  `authErrors.ts`, `i18n.ts`, `styles.css`, related component tests
- Ops/docs: `.dev.vars.example`, `package.json` + `scripts/bench-scrypt.ts` +
  `scripts/README.md`, `docs/provision.md`, `docs/deployment.md`,
  `docs/inventory-*.md`, `docs/testing.md`, `docs/plans/auth-registration-plan.md`,
  `.agents/notes.md`
- This session log

## Verification

- `npm test` — 17 files, 158 tests passed (includes live OTP Turnstile
  fail-closed case)

## Pending

### Handoff — before first identity/OTP deploy (next deploy agent)

1. Remind/configure **Cloudflare Turnstile** (`TURNSTILE_SITE_KEY` +
   `TURNSTILE_SECRET_KEY`) — without secret, live OTP fail-closes
   (`turnstile_misconfigured`); keys still required for working OTP.
2. Remind/configure **Twilio Verify** (Account SID, Auth Token, Verify Service
   SID) — still Pending; Gateway fallback.
3. Enable **budget alerts** for Telegram Gateway + Twilio spend.
4. Context: `TELEGRAM_GATEWAY_TOKEN` may already be live; `OTP_SINK_MODE`
   absent in Dev/Prod = real Gateway once code deploys. Do not set
   `OTP_SINK_MODE` there.
5. Do not create keys in chat unless owner requests; follow
   `docs/provision.md` / `docs/deployment.md` / `.agents/notes.md`.

Other open: Workers-side scrypt CPU confirm; email OTP / Telegram link APIs;
persist notify preference; legal retention text.
