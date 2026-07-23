# Overlay scrim + shared scroll lock

## Summary
Unified overlay presentation and body scroll lock: brand `--overlay-scrim` /
`--overlay-blur` on all backdrop classes; one `body.scroll-locked` path with
scrollbar-gap compensation for drawer and `AppDialog` (SHELL-001/002).

## Key decisions
- Single lock class `scroll-locked` instead of `sidebar-open` / `modal-open`.
- Nested locks share one measured gap; CSS var clears on last release.
- Same scrim for every overlay surface; blur off under `prefers-reduced-transparency`.
- Dropped thin `useSidebarScrollLock` wrapper → `useBodyScrollLock` only.

## Files changed
- `src/client/styles.css`, `src/client/lib/scrollLock.ts`
- `src/client/hooks/useBodyScrollLock.ts` (new); deleted `useSidebarScrollLock.ts`
- `AccountShell.tsx`, `AppDialog.tsx`
- `docs/regression.md` (SHELL-001/002/003), `docs/plans/gentelella-fidelity-audit.md`

## Verification
- `npm test -- src/client/lib/scrollLock.test.ts src/client/components/AppDialog.test.ts`
- Client `tsc --noEmit` (clean)

## Pending
- Manual visual: drawer + modal scrim/lock on classic-scrollbar viewport
- Unrelated uncommitted: `i18n.ts` copy polish, `.cursor/rules/ui-copy-voice.mdc`
