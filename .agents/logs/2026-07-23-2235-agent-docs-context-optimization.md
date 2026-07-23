# Agent / docs context optimization

**Date:** 2026-07-23 22:35

## Summary
Cut agent cold-start and always-apply waste, then critique + meaning-preserve
fixes so shortened docs keep operational points (OTP gate, `.env.cloudflare`,
local-dev catalog/sandbox). Docs/rules/skills only; no product code.

## Key decisions
- On-start: `notes.md` + **1** newest log; skip `archive/`
- `/resume` default = newest **3**; always-apply only `local-dev-server`
- Phone-masking / UI icons / infra-docs → globs (`package.json`, `migrations/**`)
- Docs router in `docs/README.md`; thin `auth-registration-STATUS.md`
- Regression: index-first triage; Status = `Fixed` (no invented SHAs)
- **Shortening gate** (index + compress/update-project-docs/update-regression):
  OLD vs NEW meaning (~2+2 sentences) must match before save
- Restored after over-trim: OTP remind-owner checklist, never-read
  `.env.cloudflare`, local-dev script table + sandbox/`all` note
- KB UX pointers in notes (paths only); commit skill keeps infra docs gate

## Files changed
- `.agents/{notes,index}.md`, skills (commit/compress/resume/update-*)
- `.cursor/rules/{local-dev-server,phone-display-masking,infrastructure-documentation}.mdc`
- `docs/{README,regression}.md`, `docs/plans/auth-registration-STATUS.md`
- `.gitignore`, `.cursorignore` — ignore `.agents/tmp/`; ignore archive search
- `.agents/logs/archive/` — 4 outliers + README; compact change-phone log kept active

## Verification
- Spot-check sizes: notes ~1.5KB, index ~2.3KB, local-dev ~0.9KB
- Sanity: OTP gate + never-read `.env.cloudflare` present; resume=3; infra globs
  include `package.json`/`migrations/**`; no secrets staged
- Skip full test suite (docs-only)

## Pending
- None for this commit
