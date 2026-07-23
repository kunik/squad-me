---
name: resume
description: Restores working context from recent session logs. Use for /resume, /resume N, /resume <topic>, "restore context", "what were we doing", or a handoff after a gap.
---

# Resume

1. Select logs from `.agents/logs/` (skip `archive/`):
   - `/resume`: newest **3**
   - `/resume N`: newest N
   - `/resume <topic>`: filename/content matches, newest first, maximum 20
2. Read selected files in parallel when possible.
3. Summarize sessions loaded, date range, active work, decisions, verification
   state, and open items.
4. Resolve conflicts in favor of newer logs, but call out uncertainty.
5. Keep the result compact; do not replay every log.
