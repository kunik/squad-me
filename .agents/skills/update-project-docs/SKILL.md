---
name: update-project-docs
description: Keeps project documentation aligned with durable behavior, architecture, APIs, data models, dependencies, workflows, and product decisions. Use after significant implementation changes or when documentation is stale.
---

# Update Project Docs

1. Inspect the repository's existing documentation structure and conventions.
2. Identify durable changes: behavior, contracts, schemas, architecture,
   dependencies, setup, operations, terminology, or product decisions.
3. Update the most focused document first. Keep the root README concise and use
   it as an overview and index.
4. Update documentation indexes and cross-links when files are added or moved.
5. Remove stale or contradictory claims related to the change.
6. **Shortening gate** — before saving a shortened doc: ~2 sentences on OLD
   meaning/value, ~2 on NEW. Mismatch → revise before write (better compression
   or pointers; do not silently drop the point). Ownership moves need a correct
   pointer to the new owner.
7. Verify commands and examples against source/configuration where possible.
8. For docs-only edits, validate links/formatting if tooling exists. For code
   plus docs, use the project's relevant verification commands.
9. Report which docs changed and what durable knowledge they now capture.
