# План: full-site Gentelella redesign

**Статус:** заплановано, ще не розпочато.
**Гілка:** `experiment/gentelella-redesign` → перейменувати на `redesign/site-wide`.
**Підхід:** rebuild на layout Gentelella v4 (не reskin існуючих компонентів) — функціональність Squad Me переносимо в розмітку шаблону; бренд-токени (dark base, tactical orange, Inter) залишаються свої.

## Overview

Rebuild the entire Squad Me React client on top of Gentelella-v4's actual page layouts (sidebar + topbar shell, dashboard, profile/settings, tables, auth) — porting Squad Me's functionality *into* the new template markup rather than reskinning the existing components — while keeping Squad Me's own brand tokens. Matches («Мої матчі») and Linked Shooters stay their own routes/pages, not profile sections, backed by mock data since no backend exists yet for them.

## Decisions locked in this session

- **Branch:** rename `experiment/gentelella-redesign` → `redesign/site-wide` and continue on it (carries forward the untracked/dirty state already there).
- **Visual + structural base:** Gentelella v4 (`gentelella.colorlib.com` / `ColorlibHQ/gentelella`) — cloned locally **read-only as reference** (it's Vite/vanilla-JS, not a drop-in React base). For each Squad Me screen we pick one concrete Gentelella template page and rebuild that page's actual layout/markup in React/JSX, then port Squad Me's data and behavior into it — layout leads, not the old component tree. Colors stay Squad Me's own tokens (`--color-accent` tactical orange, dark base, Inter) mapped into Gentelella's CSS-variable slots, not Gentelella's default palette — Gentelella's own theme-generator design explicitly supports swapping the primary color this way.
- **Rebuild, not reskin:** where a Gentelella template's structure doesn't map 1:1 onto an existing Squad Me component (e.g. accordion side-menu → sidebar nav, card-based section → tabbed settings), re-implement the feature against the new layout instead of forcing the old markup into new CSS classes. The old `profile-page__*` / `user-menu__*` / `public-header__*` classes and their DOM shape are not preserved as a contract — only the *behavior* they implement is (see regression checklist below).
- **Functional reference:** [ProfilePage.tsx](../../src/client/pages/ProfilePage.tsx) + its child components are the behavioral spec — read them to enumerate what each screen must still do, then rebuild that behavior against the new template.
- **Structural separation:** Matches (`/matches`) and Linked Shooters (`/linked-shooters`) remain separate top-level routes/sidebar items, not profile sections — already true in [profileMenu.ts](../../src/client/lib/profileMenu.ts)/[App.tsx](../../src/client/App.tsx); redesign keeps this, just gives both real Gentelella-templated content instead of the current placeholder stub.
- **Data:** [MatchesPage.tsx](../../src/client/pages/MatchesPage.tsx) dashboard and [LinkedShootersPage.tsx](../../src/client/pages/LinkedShootersPage.tsx) lists ship on **mock/static data** (per KB `screens/dashboard.md` — 2 upcoming + 1 past demo match). No backend work in this redesign; `src/server` for matches/clubs doesn't exist yet and is explicitly out of scope.
- **KB sync:** update `products/match-platform/design/principles.md` + `specs/brand-brief.md` + `design/app-shell-brief.md` in the knowledge base to record the Gentelella structural pivot (still dark/orange brand tokens) — routine sync of an existing design decision, no extra confirmation needed per standing KB rule.

## Regression checklist (must survive the rebuild)

Each phase below that rebuilds an existing page must re-verify these behaviors against the new markup before being considered done:

- **Shell:** auth-gated routing (`RequireAuth`/`RequireGuest`/`OnboardingGuard` in [App.tsx](../../src/client/App.tsx)), nickname fetch/display, unread badge, language switch persists locale, logout clears session and redirects.
- **Profile:** view/edit toggle per section, dirty-state discard-confirmation dialog ([useUnsavedDiscard.ts](../../src/client/hooks/useUnsavedDiscard.ts)), onboarding step forcing a section into edit mode + skip actions, scroll-spy anchor highlighting ([useProfileScrollSpy.ts](../../src/client/hooks/useProfileScrollSpy.ts)), delete-account confirmation-phrase dialog.
- **Auth pages:** OTP send/verify/resend-timer flow ([OtpStep.tsx](../../src/client/components/OtpStep.tsx)), Turnstile gating, password field show/hide, `?next=` redirect handling, login/register error message mapping (`authErrors.ts`).
- **Change phone:** 3-step wizard (confirm current → new phone → OTP), reauth-proof handoff.

## Phase 0 — Setup & template survey (main agent, no subagent)

1. Rename branch `experiment/gentelella-redesign` → `redesign/site-wide`.
2. `git clone --depth 1` Gentelella v4 into a scratch path **outside the repo** (e.g. `/tmp/gentelella-ref`) for reference only — never added as a dependency or committed.
3. Survey the cloned repo's page inventory (58 pages) and pick one concrete template per Squad Me screen:
   - Shared shell → the sidebar+topbar skeleton used by all pages (`shell-render.js` output).
   - Profile → Gentelella's profile/settings template (tabbed or card-sectioned personal-info page).
   - Matches dashboard → Gentelella's main dashboard/stat-card-grid template.
   - Linked Shooters → a Gentelella table/list or contacts-style template.
   - Auth pages → Gentelella's login/register template.
   Record the chosen file paths in a short scratch note for subagents to reference directly (not the whole cloned repo).
4. Leave the pending unrelated `--layout-max-width` tweak in [styles.css](../../src/client/styles.css) as-is; it will be superseded by Phase 1.

## Phase 1 — Foundation: tokens, primitives, app shell

- Extract Gentelella's sidebar width/topbar height/card radius/shadow/table row/badge/form-field specs from the chosen reference templates (`_tokens.scss`, `_layout.scss`, `_components.scss`).
- Merge new layout tokens into [styles.css](../../src/client/styles.css) `:root` alongside existing color tokens (`--color-accent`, `--color-surface`, etc. stay; Gentelella's own palette does not get imported).
- Build the shared app shell in React from the chosen shell template's actual markup: sidebar (nav items driven by existing [PROFILE_MENU_GROUPS](../../src/client/lib/profileMenu.ts) data), topbar (brand mark + user menu), replacing [AccountShell.tsx](../../src/client/components/AccountShell.tsx), [ProfileSideMenu.tsx](../../src/client/components/ProfileSideMenu.tsx), [PublicHeader.tsx](../../src/client/components/PublicHeader.tsx) — port in nickname fetch, unread badge, language switch, logout, scroll-spy hookup from the current implementations (see regression checklist).
- Unauthenticated chrome ([PublicChrome.tsx](../../src/client/components/PublicChrome.tsx)) gets a lighter topbar-only variant (no sidebar) for Login/Register/ForgotPassword/ChangePhone/Home.
- Build reusable `Card`, `SectionHeader`, `Badge`, `Table` primitive components matching the chosen templates' markup/classes, replacing the old `profile-page__block` / `ProfileSectionHeader.tsx` ad-hoc pattern.

**Subagent:** Opus, tightly scoped — give it only the chosen shell template file(s), [profileMenu.ts](../../src/client/lib/profileMenu.ts), [AccountShell.tsx](../../src/client/components/AccountShell.tsx)/[ProfileSideMenu.tsx](../../src/client/components/ProfileSideMenu.tsx)/[PublicHeader.tsx](../../src/client/components/PublicHeader.tsx), and the regression checklist above. This is the highest-complexity, highest-regression-risk piece — most behavior to port.

## Phase 2 — Profile page rebuild

Rebuild [ProfilePage.tsx](../../src/client/pages/ProfilePage.tsx) inside the chosen Gentelella profile/settings template layout: personal details, disciplines, notifications, actions as sections/tabs per that template's structure, using the Phase 1 `Card`/`SectionHeader` primitives. Port in (not preserve markup of) all existing state/handlers: view/edit toggle, dirty guards, onboarding step handling, delete-account dialog. [ProfileForm.tsx](../../src/client/components/ProfileForm.tsx), [ProfileSummary.tsx](../../src/client/components/ProfileSummary.tsx), [NotificationChannelsForm.tsx](../../src/client/components/NotificationChannelsForm.tsx), [DivisionsForm.tsx](../../src/client/components/DivisionsForm.tsx) get rebuilt form-field markup matching the template's form styling.

**Subagent:** Opus — most existing logic/state to carry over correctly (see Profile regression checklist).

## Phase 3 — Matches dashboard rebuild

Build [MatchesPage.tsx](../../src/client/pages/MatchesPage.tsx) inside the chosen Gentelella dashboard template, per KB `screens/dashboard.md`:

- Header + "+ Новий матч" button (mock role-visibility toggle).
- Featured card for the nearest upcoming match (accent border), grid of remaining upcoming cards, muted "Минулі" section.
- Role badge per card (`org`/`federation_rep`/shooter chip) via the Phase 1 `Badge` primitive and existing semantic status colors.
- Mock data module (3 demo matches) colocated with the page.
- Empty-state copy for zero matches (write a reasonable UA string consistent with [i18n.ts](../../src/client/i18n.ts)).

**Subagent:** claude-sonnet-5-thinking-high — greenfield content but needs careful data modeling for the role-badge/status mapping.

## Phase 4 — Linked Shooters rebuild

Build [LinkedShootersPage.tsx](../../src/client/pages/LinkedShootersPage.tsx) inside the chosen Gentelella table/list template as two lists ("Кого я реєструю" / "Хто реєструє мене") on mock data, reusing the Phase 1 `Table`/empty-state patterns.

**Subagent:** composer-2.5-fast — simple, repetitive list pattern, low risk.

## Phase 5 — Auth pages rebuild

Rebuild [LoginPage.tsx](../../src/client/pages/LoginPage.tsx), [RegisterPage.tsx](../../src/client/pages/RegisterPage.tsx), [ForgotPasswordPage.tsx](../../src/client/pages/ForgotPasswordPage.tsx), [ChangePhonePage.tsx](../../src/client/pages/ChangePhonePage.tsx) inside the chosen Gentelella login/register template layout, porting in (unchanged) the OTP wizard, Turnstile, and password-field logic per the auth regression checklist. Reuse [PasswordField.tsx](../../src/client/components/PasswordField.tsx), [OtpStep.tsx](../../src/client/components/OtpStep.tsx), [TurnstileWidget.tsx](../../src/client/components/TurnstileWidget.tsx) with rebuilt markup/styling to match the template.

**Subagent:** cursor-grok-4.5-high-fast — repetitive pattern across 4 similar pages once the first is done; moderate care needed for OTP/Turnstile wiring.

## Phase 6 — Home landing restyle

Rebuild [HomePage.tsx](../../src/client/pages/HomePage.tsx) hero within the new visual system (logo, tagline, CTA) — simplest page, no new sections.

**Subagent:** composer-2.5-fast — trivial, low risk.

## Phase 7 — Verification + KB sync

- `npm run typecheck`, `npm run test`, spot-check `npm run test:e2e` for auth/profile flows — expect e2e/unit tests that assert on old class names or DOM shape to need updates since markup is rebuilt, not reskinned.
- Walk the regression checklist above against the rebuilt pages manually (or via browser subagent).
- Grep for now-orphaned `profile-page__*`/`user-menu__*`/`public-header__*` CSS rules left behind in [styles.css](../../src/client/styles.css) once no component references them.
- Browser subagent screenshot pass: Login, Register, Matches, Profile, Linked Shooters at desktop + mobile widths, compared against the chosen Gentelella reference templates for structural fidelity.
- Update KB `design/principles.md`, `specs/brand-brief.md`, `design/app-shell-brief.md` (Gentelella structural pivot, sidebar replaces accordion, dark/orange tokens retained) and `.agents/logs/` session log per the commit skill.

## Subagent strategy

Available models for Task subagents: `claude-opus-4-8-thinking-high`, `claude-sonnet-5-thinking-high`, `composer-2.5-fast`, `cursor-grok-4.5-high-fast`, `claude-fable-5-thinking-high`, `gpt-5.6-sol-medium`, `gpt-5.6-terra-medium`.

| Phase | Model | Why |
| --- | --- | --- |
| 1 Shell | Opus | Highest logic-porting risk |
| 2 Profile | Opus | Most existing state/handlers to carry over |
| 3 Matches | Sonnet-thinking | Greenfield + role-badge data modeling |
| 4 Linked Shooters | composer-2.5-fast | Mechanical list pattern |
| 5 Auth | cursor-grok-4.5-high-fast | Repetitive across 4 pages |
| 6 Home | composer-2.5-fast | Trivial |

Every subagent prompt gets only the specific files it touches, the chosen template reference, and the relevant slice of the regression checklist — never the full KB or full plan.

## Implementation todos

- [ ] **phase0** — Rename branch to `redesign/site-wide`; clone Gentelella v4 locally as reference; pick a concrete template page per Squad Me screen
- [ ] **phase1** — Build app shell (sidebar+topbar) from chosen Gentelella shell template, port nav/user-menu/auth behavior in; extract tokens; build Card/SectionHeader/Badge/Table primitives (Opus)
- [ ] **phase2** — Rebuild ProfilePage inside chosen Gentelella profile/settings template, porting all existing logic (Opus)
- [ ] **phase3** — Rebuild Matches dashboard inside chosen Gentelella dashboard template with mock data + role badges (Sonnet-thinking)
- [ ] **phase4** — Rebuild Linked Shooters inside chosen Gentelella table/list template with mock data (composer)
- [ ] **phase5** — Rebuild Login/Register/ForgotPassword/ChangePhone inside chosen Gentelella auth template, porting OTP/Turnstile logic (cursor-grok)
- [ ] **phase6** — Rebuild HomePage hero within new visual system (composer)
- [ ] **phase7** — Typecheck/test/e2e, regression-checklist walkthrough, screenshot verification, sync KB design docs + session log
