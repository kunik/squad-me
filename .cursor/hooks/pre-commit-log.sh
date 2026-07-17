#!/usr/bin/env bash
# Require the session log workflow before a commit is created.
cat <<'EOF'
{
  "permission": "ask",
  "user_message": "Session not yet logged — run the compress/log skill before this commit?",
  "agent_message": "Before committing, read .agents/skills/compress/SKILL.md and write or update the relevant session log in .agents/logs/. Then retry the commit."
}
EOF
