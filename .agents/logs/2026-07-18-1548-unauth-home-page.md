# Unauthenticated home page

**Date:** 2026-07-18 15:48

## Summary

Replaced the coming-soon stub with a routed unauthenticated public surface: `/` landing (atmosphere, PublicHeader with logo + UA/EN + Увійти, brand hero, CTA to `/login`) and a `/login` placeholder until IdP is chosen. Added `react-router-dom`, lightweight i18n/locale, and updated meta/docs notes accordingly.

## Key decisions

- Public match listing stays out of the first viewport / product surface — invite-link only.
- `/login` is intentionally a placeholder; no auth provider wired yet.
- UA/EN locale switch lives in the public header; strings via `i18n.ts` + `LocaleProvider`.
- Production remains public for the landing surface (no Access); wording in `docs/provision.md` updated from “coming-soon stub”.

## Files changed

- `src/client/App.tsx`, `main.tsx` — BrowserRouter, LocaleProvider, `/` + `/login` routes
- `src/client/pages/HomePage.tsx`, `LoginPage.tsx`
- `src/client/components/PublicAtmosphere.tsx`, `PublicHeader.tsx`
- `src/client/i18n.ts`, `locale.tsx`
- `src/client/styles.css`, `index.html`
- `package.json`, `package-lock.json` — `react-router-dom`
- `docs/provision.md`, `.agents/notes.md`
- `.agents/logs/2026-07-18-1548-unauth-home-page.md` (this log)

## Verification

- `npm run typecheck` — pass
- `npm run build` — pass

## Pending

- Choose and wire IdP for real `/login`
- Deploy updated client to Dev/Production when ready
