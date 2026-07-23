# Auth / registration — status

One-page pointer. Full plan: [`auth-registration-plan.md`](./auth-registration-plan.md).

**OTP deploy gate (checkboxes):** `.agents/notes.md` § "Before first identity/OTP deploy"
→ `docs/deployment.md` § "Before first identity/OTP deploy",
`docs/provision.md` § "Identity / auth secrets".

| Phase | Status | Notes |
|---|---|---|
| **0** Secrets & alerts | **Pending (owner)** | Turnstile, Twilio Verify, budget alerts — see gate above |
| **1** Schema + password + session | **Done** | D1 identity migrations; scrypt; sessions. Confirm Workers CPU bench before raising traffic (`npm run bench:scrypt` = local sample). |
| **2** Phone OTP API | **Code done** | Gateway → Twilio adapters + fake sink. Live OTP needs Phase 0. |
| **3** Register / login / reset + UI | **Done** | `/login`, `/register`, `/forgot-password`; phone → OTP → password(+nickname). |
| **4** Hardening | **Done** | Rate limits, masked phone in logs, sweeps, regressions. |
| **5** Notify hooks (light) | **Stubs + UI shell** | Stub tables; notifications UI email+Save; Telegram/email-OTP hidden until APIs. |

**Post-auth onboarding:** `profile → disciplines → email → null` via
`GET /api/auth/me` `onboardingStep` (see plan §§ Profile / Threat model).
