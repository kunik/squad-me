# Cloud Dev deploy routes token fix

## Summary
After favicon icons landed on `main`, Deploy Cloud Dev uploaded the Worker then failed with API `10000` on `/zones/.../workers/routes`. Token `squad-me-ci-dev` was missing Zone `squadme.app` → Workers Routes → Edit. After the scope was added, the re-run succeeded (deploy + seed + smoke).

## Key decisions
- Account-level Workers permissions are not enough for custom-domain route attach; Zone Workers Routes Edit is required (already documented in `docs/provision.md`).
- Production promote remains manual `workflow_dispatch` on Deploy Production (not push-to-main).

## Files changed
- None in this wrap-up (ops/token fix only). Prior session commit: `704ad14` favicon/PWA icons.

## Verification
- Deploy Cloud Dev run `29618260165` green after token edit.
- Working tree clean at log time; `main` at `028e2b7` matching `origin/main`.

## Pending
- None for this incident.
