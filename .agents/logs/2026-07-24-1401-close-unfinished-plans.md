# Close unfinished plans

## Summary
Persisted Cursor close-unfinished-plans outcome into the repo: deleted Gentelella fidelity/redesign plans, marked Profile col-4-8 won't-do, updated Auth STATUS/plan (Phase 5 stub Done; Phase 0 owner pending; scrypt Workers bench won't-do until traffic), and saved a durable plan note under `docs/plans/`.

## Key decisions
- Gentelella plans: delete, do not archive as Done.
- Profile IA `col-4-8` rebuild: won't do; keep shipped `col-8-4`.
- Auth Phase 5: Done as designed (stub scope v1); email-OTP/Telegram/preference/push = won't do v1.
- Auth Phase 0: remains Pending (owner) — Turnstile, Twilio Verify, budget alerts.
- Scrypt: local `bench:scrypt` Done; deployed Workers CPU bench won't do until traffic ramp.

## Files changed
- `docs/plans/close-unfinished-plans.md` (new)
- `docs/plans/auth-registration-STATUS.md`, `docs/plans/auth-registration-plan.md`
- `docs/README.md` (router/catalog: drop Gentelella plan links; point to close-unfinished note)
- Deleted `docs/plans/gentelella-fidelity-audit.md`, `docs/plans/gentelella-redesign-plan.md`

## Verification
- Docs-only change set; no product code/tests. Diff reviewed for secrets (none).

## Pending
- Owner: Auth Phase 0 secrets/alerts per `docs/provision.md`.
