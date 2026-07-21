# Forgot-password → register soft handoff

## Summary

Password reset for an unknown phone was returning `invalid_or_expired_proof` (“Підтвердження застаріло”), which was intentional anti-enumeration but misleading UX. Implemented the inverse of register-as-reset: after successful `password_reset` OTP with no account, remint the proof to `register`, return `accountMode: "created"`, and soft-navigate the client to `/register` (neutral copy, no explicit “account does not exist”).

## Key decisions

- Post-OTP existence signal via `accountMode` is acceptable (already used for register-as-reset).
- Remint proof purpose server-side so `/register` can finish without a second OTP.
- Keep `password/reset` no-account → generic `invalid_or_expired_proof` as defense in depth.

## Files changed

- `src/worker/identity/routes.ts` — `accountMode` for `password_reset` OTP; remint unknown-phone proof to `register`
- `src/client/pages/ForgotPasswordPage.tsx` — on `created`, save register proof + `navigate("/register", { replace: true })`
- `src/worker/identity/routes.test.ts` — assert remint handoff; existing reset test expects `accountMode: "password_reset"`

## Verification

- `npm test -- --run src/worker/identity/routes.test.ts` → 25/25 passed (earlier parallel runs hit 20s timeouts; not logic failures)
