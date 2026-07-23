# Project Notes

Non-derivable operational facts only. Durable product/UX → docs / KB / plans.
Never store secrets or tokens here.

<!-- Add entries below. -->

## ⚠ Before first identity/OTP deploy (Dev or Prod)

Remind the owner and configure these **before** shipping auth OTP that can hit
live providers. Mirror checklist (keep boxes until done); fail-close detail in
`docs/deployment.md` § "Before first identity/OTP deploy",
`docs/provision.md` § "Identity / auth secrets".

- [ ] **Turnstile** — widget + `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`
- [ ] **Twilio Verify** — Account SID + Auth Token + Verify Service SID (Pending)
- [ ] **Budget alerts** — Telegram Gateway + Twilio before public OTP
- Context: `TELEGRAM_GATEWAY_TOKEN` may already be live; Dev/Prod omit
  `OTP_SINK_MODE` (real Gateway). Local/CI: `OTP_SINK_MODE=log`.

## Pointers (do not duplicate)

- Infra / zone / Access / tokens workflow → `docs/provision.md`, inventories.
  Agents: run npm/scripts only — **never** Read/cat `.env.cloudflare`.
- Deploy / OTP gate / CI → `docs/deployment.md`
- Auth phases / onboarding (`profile → disciplines → email`) →
  `docs/plans/auth-registration-STATUS.md` → full plan only if needed
- HintPanel / chevron / FieldHint / membership copy / auth exit link → KB
  `products/match-platform/notes.md` (UX §),
  `products/match-platform/design/principles.md` (§ Exit-лінк на auth-формах),
  `products/match-platform/specs/user-profile.md`,
  `products/match-platform/design/screens/user-profile.md`;
  client: `AuthExitLink` / `authExit.ts` under `src/client/`
- Agent doc router → `docs/README.md`
