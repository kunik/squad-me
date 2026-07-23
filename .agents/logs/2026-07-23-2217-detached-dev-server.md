# Detached local Vite manager (agent-safe)

## Summary

Added a detached Vite/workerd process manager so Cursor agents can start,
stop, restart, and read logs without owning a foreground shell that gets
reaped. Documented agent policy for when/how to restart vs rely on HMR.

## Key decisions

- Prefer `npm run dev:start|stop|restart|status|logs` over raw `npm run dev`
  or `pkill`.
- Keep foreground `npm run dev` for humans with an attached terminal.
- Do not restart for routine source edits (HMR); restart only if the server
  is down, the user asks, or after env/secrets, Wrangler bindings, Vite
  config, or dependency install.
- PID/log files (`.dev-server.pid`, `.dev-server.log`) are gitignored.

## Files changed

- `scripts/dev-server.sh` (new)
- `package.json` — `dev:start|stop|restart|status|logs`
- `.gitignore` — `.dev-server.pid` / `.dev-server.log`
- `scripts/README.md` — catalog entries for detached manager
- `docs/deployment.md`, `docs/testing.md` — short local-dev notes
- `.cursor/rules/local-dev-server.mdc` (alwaysApply)
- `.agents/index.md` — Local Vite / workerd section

## Verification

- Infra/scripts docs gate: README + deployment/testing notes present in the
  same change.
- `npm run dev:status` reports Healthy at `http://localhost:5173/` (API
  health OK). Manager scripts are wired via package.json.

## Pending

- None for this change. Agents should use the new `dev:*` scripts going
  forward.
