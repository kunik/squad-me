# Infra-setup architecture review (post-refactor)

**Date:** 2026-07-18 01:12

## Summary

Read-only review of `infra-setup/` after unify/refactor. Fit for solo bootstrap;
not IaC-mature. Two factual gaps vs docs: `.env.cloudflare.example` missing from
repo/disk (docs/rule/scripts all reference it); `attach-production-hostname.sh`
still dies on CF-managed apex AAAA delete `1043` (`100::`) — not documented in
`docs/provision.md` troubleshooting (only in session log 0102).

## Do not implement here

Review-only; backlog left for a follow-up change.
