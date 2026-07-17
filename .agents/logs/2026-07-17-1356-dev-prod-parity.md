# Dev/Prod parity scaffold

**Date:** 2026-07-17 15:15

## Summary

Implemented two-tier delivery in-repo (local workerd + Cloud Dev + Production),
documented provision steps, authenticated Wrangler, and provisioned Cloud Dev
D1/R2/Queues. Worker not deployed yet; Access/DNS/GitHub Environments remain.

## Key decisions
- Named Wrangler envs `dev` / `production`; top-level config is local-only.
- GitHub Actions only (not Workers Builds); Production is `workflow_dispatch` + approval.
- Parity check: shape on PR, `--strict` (provisioned IDs) on deploy.
- Use `npx wrangler`; Cloudflare skills installed under `~/.cursor/skills/`.

## Files changed
- `wrangler.jsonc`, `vite.config.ts`, `package.json` — Worker/SPA toolchain
- `src/worker/*`, `src/client/*`, `migrations/` — minimal runnable scaffold
- `.github/workflows/{ci,deploy-dev,deploy-production}.yml` — delivery gates
- `docs/{testing,deployment,provision,inventory-dev}.md` — ops docs
- `scripts/{provision-dev.sh,seed-dev.ts,parity-check.mjs,smoke-cloud-dev.ts}`
- `.agents/notes.md` — account/provision operational facts

## Verification
- `npm run parity:check` — pass (shape)
- `npm run typecheck` — pass
- `npm test` — pass (concurrency scaffold)
- `npm run migrations:local` — pass
- `npm run build` / `npm run build:dev` — pass
- `npm run provision:dev` — Cloud Dev D1/R2/Queues created; migrations applied

## Pending
- [ ] DNS + custom domain `dev.squadme.app`
- [ ] Cloudflare Access for Dev
- [ ] GitHub Environments `cloud-dev` / `production`
- [ ] First `npm run deploy:dev` + smoke
