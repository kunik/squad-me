---
name: compress
description: Saves repository and knowledge-base work to separate compact session logs. Use when the user invokes /compress or /log, asks to save or log the session, or wants a handoff before ending significant work.
---

# Compress / Log

1. Review the conversation, repository working tree, knowledge-base operations,
   and relevant verification results.
2. Partition the session by destination:
   - **Repository work** — code, configuration, documentation, decisions, and
     files belonging to the current repository.
   - **Knowledge-base work** — notes, indexes, links, specifications, product
     decisions, and other files created, edited, moved, or organized in the
     Obsidian knowledge base.
   Do not duplicate a change in both logs.
3. For repository work, check `.agents/logs/` for a log from today on the same
   topic. Update it, or create
   `.agents/logs/YYYY-MM-DD-HHMM-<slug>.md`.
4. If the session changed the knowledge base, invoke the knowledge base's
   `/log` (`/compress`) skill and follow its current instructions. Its log must
   describe only the knowledge-base part of the session and be written inside
   the knowledge base.
5. When both partitions contain changes, prepare and write both logs
   independently and in parallel where the available tools allow it. If only
   one partition contains changes, write only that partition's log; do not
   create an empty companion log.
6. Include only sections with content: Summary, Key decisions, Files changed,
   Verification, and Pending.
7. State facts and outcomes, not a transcript. Never include secrets or tokens.
8. Confirm every path written, grouped as repository log and knowledge-base
   log.
