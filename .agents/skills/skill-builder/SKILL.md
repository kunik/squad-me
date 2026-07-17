---
name: skill-builder
description: Creates and validates portable Agent Skills. Use when the user asks to create, build, add, or revise a repeatable skill or workflow.
---

# Skill Builder

1. Infer or gather the skill name, purpose, trigger phrases, workflow, expected
   outputs, constraints, and required tools.
2. Use a short kebab-case name. Avoid project names unless the workflow is
   intentionally project-specific.
3. Write `.agents/skills/<name>/SKILL.md` with YAML frontmatter containing
   `name` and a description that states both what it does and when to use it.
4. Make instructions actionable and tool-agnostic where possible. Discover
   project commands from repository configuration instead of hard-coding them.
5. Put large supporting material in `references/`; do not add a redundant
   README inside the skill directory.
6. Register the skill in `.agents/index.md`.
7. Validate folder/name consistency, frontmatter, trigger specificity, links,
   safety constraints, and absence of secrets or accidental project details.
8. Return the created paths and representative trigger/non-trigger examples.
