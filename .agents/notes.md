# Project Notes

Store concise operational facts that are useful in future sessions but cannot
be derived reliably from source code, documentation, or git history.

<!-- Add entries below. -->

- Cloudflare account Taras (`2758c21b02e5c7efcfa745cb49948ace`); use
  `npx wrangler`. Full infra steps: `docs/provision.md`.
- Zone `squadme.app` on account: ID `c224b051f2d19f3900b68c0d69ffb3c6`,
  status `active`, NS `barbara`/`miguel.ns.cloudflare.com` (registrar was
  Namecheap). Account `workers.dev` subdomain: `squad-me`.
- Cloud Dev provisioned + deployed: Worker `squad-me-dev-app`, custom domain
  `dev.squadme.app` attached (see `docs/inventory-dev.md`). Free plan: no
  `limits.cpu_ms` on `env.dev` or `env.production` (parity; re-add when
  Workers Paid). Access live on Dev: Zero Trust team `squad-me` →
  `squad-me.cloudflareaccess.com`, app `squad-me-dev`, policy
  `Allow Dev operators` (`taras.kunch@gmail.com`); manage via
  `npm run provision:access:dev` with an Access-capable API token (Wrangler
  OAuth lacks Access scopes). GitHub Environments `cloud-dev` + `production`
  exist (`production` has no required reviewers — gate is manual
  `workflow_dispatch` only; optional `commit_sha`, empty = latest `main`); both have
  `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`. Dashboard names:
  Dev `squad-me-ci-dev`, Prod `squad-me-ci-prod` (rename alone does not
  change the secret string). `cloud-dev` also has `CF_ACCESS_CLIENT_*`.
- Local Cloudflare API tokens: gitignored `.env.cloudflare` (template
  `.env.cloudflare.example`). Keys: `CLOUDFLARE_API_TOKEN_DNS`,
  `CLOUDFLARE_API_TOKEN_ACCESS`, fallback `CLOUDFLARE_API_TOKEN`. Scripts in
  `scripts/infra-setup/` load via `lib/common.sh`. Agents must run npm scripts —
  never Read/cat `.env.cloudflare`. Keep Access / CI / DNS tokens separate.
- Production: `npm run provision:production` created `squad-me-production-*`
  (D1 id in `wrangler.jsonc` / `docs/inventory-production.md`). Worker
  `squad-me-production-app` + apex `squadme.app` attached (health OK). Recover
  DNS conflicts with `CLOUDFLARE_API_TOKEN_DNS` in `.env.cloudflare` then
  `npm run attach:production:hostname`. Production stub is public (no Access).
  One-time bootstrap in `scripts/infra-setup/`; runtime helpers in `scripts/`.
  Infra rule: document every infra action; prefer those scripts.
- Client unauth home (`/`): atmospheric public surface + header (logo,
  UA/EN, session-aware Log in/Log out) + brand hero + login CTA
  (`react-router-dom`). Logo: `public/logo-full.svg` from KB
  `products/match-platform/design/completed/brand/`. Palette from
  `specs/brand-brief.md` / `design/principles.md` (dark neutral + tactical
  orange `#E8823C`). Landing font Inter (same as brand guide; not Barlow).
  Atmosphere layer: flat-top honeycomb SVG (not square grid), large cells
  (`background-size` ~288×166), hairline strokes, static (no animation);
  shared via `PublicAtmosphere` / `.public-surface` on all routes. App Shell
  «панель підказки»: `PublicChrome` → fixed `.app-top-chrome` (header +
  optional narrow top-attached `HintPanel` in `.app-top-chrome__hint` —
  same `--panel-bg` / border / shadow as content panels; top-flush rectangle
  with real `--panel-radius` on bottom corners; between logo/avatar via
  `--chrome-side-gutter` (tighter with icon-only `logo-mark` <640px; Skip
  stacks under hint <420px); slide-down enter; in-flow spacer mirrors pin
  height — sticky cannot pin while `.public-surface` has `overflow: hidden`)
  — fed by `/register`, `/forgot-password`, `/profile` onboarding; future
  match-reserve. See KB `design/principles.md` § панель підказки. No public
  match listing — invite-link only.
- Post-auth onboarding (`GET /api/auth/me` `onboardingStep`): **profile →
  disciplines → email → null** (2026-07-21). Disciplines step = HintPanel +
  auto-edit «Мої дивізіони»; flag `accounts.disciplines_prompt_dismissed_at`
  (Skip or `section: "disciplines"` save). Revises earlier “divisions never
  onboarding” note. See `docs/plans/auth-registration-plan.md`.
- Auth/registration (`docs/plans/auth-registration-plan.md`) Phase 1–4 +
  Phase 5 stubs implemented in `src/worker/identity/` (password/session/
  phone/OTP/rate-limit/turnstile/routes) + `/login`, `/register`,
  `/forgot-password` UI. **Real OTP/Turnstile not live** — only the fake
  provider (`OTP_SINK_MODE=log`) is exercised anywhere (tests/local dev);
  Telegram Gateway/Twilio/Turnstile accounts + secrets are pending manual
  owner action (`docs/provision.md` § "Identity / auth secrets"). scrypt
  params (`N=2^15,r=8,p=1`) are the plan's starting point, unbenchmarked on
  real Workers CPU time.
- Avatar chrome (2026-07-21): profile avatar uses diagonal `--avatar-frame`
  (accent TL → muted BR); header user-menu avatar uses thin `--panel-border`
  like content panels. User-menu trigger is a square circle (`2.75rem`), not a
  tall pill, so hover wash stays round.
- Profile collapsible blocks (2026-07-21): expand/collapse chevron («пташка»)
  for blocks like FPSU membership / carbine (discipline) enables is **edit-mode
  only**. View/read-only hides the chevron; nested content still shows when the
  block is enabled. Edit form (`ProfileForm`) keeps the chevron; summary view
  (`ProfileSummary`) does not. Related membership/discipline copy below.
- Profile membership & discipline UX (2026-07-21):
  - Labels: «членство ФПСУ» / «членство IPSC (МКПС)» (not «Я член …»); IPSC
    number «Членський номер» (not «Номер члена IPSC»). EN: UPSF / IPSC (MKPS)
    membership; Membership number.
  - Name-language: drop per-field captions «Ім'я та прізвище (українською/
    англійською)». One full-width `.profile-form__info-note` above the
    first+last name row (shared for both fields): FPSU — enter UA names as in
    official documents; IPSC — enter EN names as in foreign travel documents.
    Visual: accent-tinted panel + “i” cue — quieter than errors, stronger than
    plain captions.
  - Placeholders: FPSU Іван / Франко / Калуш / ССК Барвінок; IPSC John / Smith /
    UA-12345 (city Калуш is UPSF-only).
  - FieldHint purpose tooltips: FPSU name → official UPSF competitions; region →
    national + oblast championships; city → city championships; club → official
    UPSF matches. IPSC name → IPSC Level III; member number → from federation
    membership certificate.
  - Division defaults when enabling a discipline: pistol `production`, carbine
    `semi_auto_open` (SAO), PCC/mini `pcc_optics`, shotgun `open`.
