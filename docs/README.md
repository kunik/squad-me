# Project Documentation

Durable project knowledge for `squad-me`. Product specs live in the Obsidian
knowledge base under `products/match-platform/`.

**Agents:** start here. Open **one** matching file/section — do not read whole
docs by default.

## Router (task → doc)

| When you need… | Open |
|---|---|
| OTP / Turnstile / Twilio / budget gate before Dev/Prod deploy | `deployment.md` § "Before first identity/OTP deploy"; checklist mirror in `provision.md` § "Identity / auth secrets" |
| Local test strategy, OTP sink, vitest commands | `testing.md` |
| Bug triage / known regressions | `regression.md` — **index table first**; full entry only for matching Open IDs / area |
| UI chrome / Gentelella fidelity | `plans/gentelella-fidelity-audit.md`; client under `src/client/` |
| Cloudflare bootstrap, Access, zone, secrets workflow | `provision.md` §§ "Cloud Dev — full order", "Production — owner order", "Zone facts (`squadme.app`)", "Identity / auth secrets", "Local API tokens" |
| Deploy tiers, CI, promote path | `deployment.md` |
| Live resource names / IDs | `inventory-dev.md`, `inventory-production.md` |
| Auth / registration phases (status) | `plans/auth-registration-STATUS.md` → full `plans/auth-registration-plan.md` only if needed |
| Script catalog (what/why) | `../scripts/README.md`, `../scripts/infra-setup/README.md` |

## Catalog

- `regression.md` — known and fixed regressions (index + full entries)
- `testing.md` — local vs Cloud Dev test strategy and commands
- `deployment.md` — build-once artifact, Wrangler envs, Dev/Prod deploy flow
- `provision.md` — Cloudflare resource bootstrap checklist (see router §§)
- `inventory-dev.md` / `inventory-production.md` — live inventories
- `plans/` — accepted feature plans (`auth-registration-plan.md`, etc.)
