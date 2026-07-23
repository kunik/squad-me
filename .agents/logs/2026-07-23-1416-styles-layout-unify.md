# Styles/layout unify — primitives, topbar, GuestChrome

**Date:** 2026-07-23 14:16

## Summary

Unified client markup/styles without changing Profile IA: domain-clean `Card`, semantic topbar `h1`, shared guest brand/utilities, badge/error/token hygiene; Profile unification deferred with an audit backlog note.

## Key decisions

- Page title lives only in AccountShell topbar (`h1.current`); page actions stay in content blocks (Matches CTA).
- Profile aside / scroll-spy / stacked sections unchanged; full Profile → Gentelella `profile.html` is explicit later backlog (product remarks pending).
- Guest surfaces share `GuestBrand` + `GuestUtilities`; Home stays intentional non-Gentelella landing.
- Semantic badge tones are canonical; nav `.badge-red/teal/blue` alias the same tokens. Auth alerts use `.form-error.form-error--banner`.

## Files changed

- Primitives / pages: `Card.tsx`, deleted `SectionHeader.tsx`, `MatchesPage.tsx`, `LinkedShootersPage.tsx`, `Badge.tsx`.
- Shell / guest: `AccountShell.tsx`, `GuestChrome.tsx` (new), `AuthLayout.tsx`, `HomePage.tsx`.
- Errors: Login/Register/Forgot/ChangePhone, `OtpStep.tsx`, `TurnstileWidget.tsx` → `form-error--banner`.
- Profile touch: `ProfileSectionHeader.tsx` / `CardHeader` → `h2.card-title`.
- Styles: `styles.css` (`--topbar-h`/`--topbar-offset`, page-actions, badge aliases), trimmed dead `.empty-state` in `gentelella.css`.
- Docs: `docs/plans/gentelella-fidelity-audit.md` §9 active wave + Profile backlog.
- Libs: `theme.ts` theme-color comment, `profileNavigation.ts` offset comment.

## Verification

- `npm run typecheck` — pass.
- `npm test` — 187 passed.

## Pending

- Manual smoke: light/dark, mobile drawer, Matches CTA, Home/Auth utilities, Profile edit/scroll-spy.
- Profile unification / IA review when product remarks are ready.
- Optional polish from audit: teal ghost on auth, SVG card-opt icons, topbar-right parity.
