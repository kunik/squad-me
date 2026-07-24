# Auth / registration — status

One-page pointer. Full plan: [`auth-registration-plan.md`](./auth-registration-plan.md).

**OTP deploy gate (checkboxes):** `.agents/notes.md` § "Before first identity/OTP deploy"
→ `docs/deployment.md` § "Before first identity/OTP deploy",
`docs/provision.md` § "Identity / auth secrets".

| Phase | Status | Notes |
|---|---|---|
| **0** Secrets & alerts | **Pending (owner)** | Turnstile, Twilio Verify, budget alerts — gate checkboxes unchecked; do not invent secrets |
| **1** Schema + password + session | **Done** | D1 identity migrations; scrypt; sessions. Local `npm run bench:scrypt` done. Deployed Workers CPU bench = **won't do until traffic ramp** |
| **2** Phone OTP API | **Code done** | Gateway → Twilio adapters + fake sink. Live OTP needs Phase 0 |
| **3** Register / login / reset + UI | **Done** | `/login`, `/register`, `/forgot-password`; phone → OTP → password(+nickname) |
| **4** Hardening | **Done** | Rate limits, masked phone in logs, sweeps, regressions |
| **5** Notify hooks (light) | **Done as designed (stub scope v1)** | UI shell + email collection + SMS-as-connected. **Won't do v1:** email OTP confirm, Telegram connect APIs, preferred-channel persistence, push APIs → future notifications plan / KB |

**Post-auth onboarding:** `profile → disciplines → email → null` via
`GET /api/auth/me` `onboardingStep` (see plan §§ Profile / Threat model).

**Open for owner only:** Phase 0 gate. Everything else in this plan is Done or won't-do v1.
