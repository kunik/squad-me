# Regression Specifications

Record each distinct bug with reproducible behavior and its test coverage.

**Agents (triage):** read this **index** first; open a full entry only for
relevant Open IDs or a matching area. Do not load the whole file by default.

## Index

Index **Status** may lag commits — trust Coverage / tests over the parenthetical.
When editing an entry, keep this table’s Status column in sync (use `Fixed` or
`Fixed (\`<sha\`)` only when the SHA is known; do not invent SHAs).

| ID | Status | Title | Area | Coverage |
|---|---|---|---|---|
| AUTH-001 | Fixed | Register-as-reset erased existing profile | RegisterPage / `POST /api/profile` | routes.test.ts |
| AUTH-002 | Fixed | Authed `/` HomeRoute Navigate loop | App / authNavigation | authNavigation.test.ts |
| AUTH-003 | Fixed | Profile black screen after phone change | useUnsavedDiscard / BrowserRouter | useNavigationBlocker.test.ts |
| AUTH-004 | Fixed | Phone-change success lost login notice | ChangePhonePage / authNotice | authNotice.test.ts |
| AUTH-005 | Fixed | Notifications Save left email onboarding open | ProfilePage / onboarding | routes.test.ts |
| PROFILE-001 | Fixed | Divisions menu did not navigate reliably | ProfilePage / scroll-spy | profileNavigation.test.ts |
| PROFILE-002 | Fixed | Skip onboarding scrolled header out of reach | ProfilePage / public-surface | profileNavigation.test.ts |
| PROFILE-003 | Fixed | Profile menu scroll overshot; upward spy flipped early | profileNavigation | profileNavigation.test.ts |
| PROFILE-004 | Fixed | Manual scroll-spy skipped Divisions | profileNavigation | profileNavigation.test.ts |
| PROFILE-005 | Fixed | Expanding membership panels shifted hex background | PublicAtmosphere / styles | PublicAtmosphere.test.ts |
| PROFILE-006 | Fixed | Profile validation banner without field highlight | ProfileForm / validation | ProfileControls.test.ts |
| PROFILE-007 | Fixed | Onboarding HintPanel blocked profile Edit | app-top-chrome / HintPanel | Manual (CSS pointer-events) |
| PROFILE-008 | Fixed | Male gender saved as empty when birth date missing | profileFormValidation | ProfileControls.test.ts |
| PROFILE-009 | Fixed | Sticky aside collapsed scroll-spy to two states | useProfileScrollSpy / aside | profileNavigation.test.ts |
| PROFILE-010 | Fixed | Document-end override skipped Divisions | resolveActiveProfileAnchor | profileNavigation.test.ts |
| PROFILE-011 | Fixed | Mobile Profile stacked identity before actions | profile-page-layout CSS | Manual (CSS order) |
| PROFILE-012 | Fixed | Mobile Profile cards stay narrow left column | profile-page-layout CSS | Manual (CSS) |
| PROFILE-013 | Fixed | Membership / discipline toggles did not mark dirty | ProfileDetailsForm / DivisionsForm | Manual |
| PROFILE-014 | Fixed | Field hint tooltip clipped by membership panel | FieldHint / profile-form__panel | FieldHint.test.ts |
| SHELL-001 | Fixed | Mobile content width jumps (scrollbar gutter) | styles / scrollLock | scrollLock.test.ts + visual |
| SHELL-002 | Fixed | Overlay scrims were slate-blue | `--overlay-scrim` | Manual (token) |
| SHELL-003 | Fixed | Mobile drawer footer stacks when rail preference set | sidebar-footer CSS | Manual (CSS) |

## Entry template

```markdown
## <AREA>-<NNN> · <short title>

**Status:** Open | Fixed (`<commit>`)
**Area:** `<component, module, or path>`
**Coverage:** `<test path or Not covered — reason>`

### Steps to reproduce
1. ...

**Expected:** ...
**Actual:** ...
```

## AUTH-002 · Authed `/` HomeRoute Navigate loop (max update depth)

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/App.tsx` (`HomeRoute`, `CatchAllRoute`, `RequireGuest`), `src/client/main.tsx`, `safeNextPath`
**Coverage:** `src/client/lib/authNavigation.test.ts` — AUTH-002 `safeNextPath` rejects `/` and guest auth entry paths; `postAuthLandingPath` never returns `/`. Manual: signed-in session on `/` lands once on `/matches` (or `/profile` while onboarding) without console “Maximum update depth exceeded”.

### Steps to reproduce
1. Sign in locally (completed onboarding or mid-onboarding).
2. Open `/` (or follow a `?next=/` / logo path that resolves through home).
3. Watch the console / React overlay.

**Expected:** One replace navigation to `/matches` (or `/profile` if `onboardingStep != null`); page stays there.
**Actual:** `HomeRoute` kept rendering `<Navigate>`, React Router `completeNavigation` re-entered forever (“Maximum update depth exceeded”). Contributing factors: outer data-router `path: "*"` wrapping App’s own `<Routes>`, catch-all `Navigate` back to `/`, and `safeNextPath` allowing `/` / `/login` as post-auth targets.

## AUTH-001 · Register-as-reset erased existing profile

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/pages/RegisterPage.tsx`, `POST /api/profile`
**Coverage:** `src/worker/identity/routes.test.ts` — `AUTH-001` register-as-reset profile preservation assertion

### Steps to reproduce
1. Create and complete a profile with membership, discipline, and personal fields.
2. Complete registration OTP again for the same phone and set a new password.
3. Let the registration client save the newly entered nickname.

**Expected:** The password is reset, other sessions are revoked, the new session signs in, and only the nickname changes. Every other profile field and `profile_completed_at` remains unchanged.
**Actual:** The client sent `{ nickname }` through the legacy full-document upsert path, which normalized every omitted field to `null`/`false` and overwrote the existing profile.

## PROFILE-001 · Divisions menu did not navigate reliably

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/pages/ProfilePage.tsx`, profile anchor scroll-spy
**Coverage:** `src/client/lib/profileNavigation.test.ts` — direct sibling/unique anchor markup, viewport reading-line transitions, bottom-to-top reset, programmatic target, and document-bottom behavior; `src/worker/identity/routes.test.ts` — sectional profile/divisions preservation contract

### Steps to reproduce
1. Sign in locally and open `/profile`, including while the profile request is still loading.
2. Click «Дивізіони» in the left profile menu.
3. Observe the viewport and active menu item near the document-bottom boundary.

**Expected:** The visible `#my-divisions` block is scrolled into view and remains active; its independent Edit/Save/Cancel flow saves `section: "disciplines"` without changing upper-profile fields.
**Actual:** Profile and divisions anchors were buried under separate form/summary wrappers rather than being direct content-section siblings. More importantly, the tall profile left too little scroll runway for the divisions top to reach the header reading line; at maximum scroll the final-section override selected actions, so manual scrolling jumped directly from profile to actions and never activated divisions. The animation-frame scroll throttle could also remain pending and stop later scroll events from recalculating the active anchor. On short layouts, `scrollY = 0` also satisfied the document-end condition, so Actions overrode Profile even at the page top.

## PROFILE-002 · Skip onboarding scrolled header out of reach

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/pages/ProfilePage.tsx`, `src/client/lib/profileNavigation.ts`, `.public-surface` overflow
**Coverage:** `src/client/lib/profileNavigation.test.ts` — `PROFILE-002` step-advance anchors are `my-divisions` (profile→disciplines) and `my-notifications` (disciplines→email); window scroll-top helper clamps so `scrollY = 0` stays reachable (Skip/Save must use that path, not `scrollIntoView`). Manual: on `/profile` with `onboardingStep === "profile"`, press Skip (or Save), confirm banner advances to disciplines, URL hash becomes `#my-divisions`, divisions section opens in edit mode, and the page scrolls after the edit form lays out (not while still on the short summary); then Skip/Save divisions → email, hash `#my-notifications`, window scrolls with scroll-margin, and scrolling back to `scrollY = 0` still shows PublicHeader/logo.

### Steps to reproduce
1. Sign in with a session that still needs the profile onboarding step and open `/profile` near the top of the page.
2. Press Skip on the HintPanel («панель підказки») so the step advances from profile → disciplines (then Skip again → email/notifications).
3. Try to scroll up to see the Squad Me logo in `PublicHeader`.

**Expected:** Banner advances profile → disciplines → email. Each Skip/Save activates the matching left-nav item via the same handler as a menu click (queued nav + window-only scroll with scroll-margin). Profile→disciplines also opens the divisions block in edit mode before scrolling, so the taller edit layout can leave `scrollY = 0` and the spy does not snap back to «Особисті дані». At `scrollY = 0` the full header/logo remains visible; scroll-spy selects «Особисті дані» at the page top.
**Actual:** After Skip, `reloadAfterStep` auto-scrolled to `#my-notifications` via `Element.scrollIntoView`. Because `.public-surface` uses `overflow: hidden` (a scroll container), that scroll moved the header out of the clipped shell while window `scrollY` stayed near zero, so the logo could not be recovered by scrolling up. A later over-correction removed Skip navigation entirely instead of routing it through the menu handler. A follow-on race also scrolled to `#my-divisions` before the divisions edit form opened (and refetched profile on every step change), so the menu highlight did not stick and edit mode did not reliably appear.

## PROFILE-003 · Profile menu scroll overshot; upward spy flipped early

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/pages/ProfilePage.tsx`, `src/client/lib/profileNavigation.ts`, `.profile-page__anchor` scroll-margin
**Coverage:** `src/client/lib/profileNavigation.test.ts` — `PROFILE-003` sticky-chrome offset ignores in-flow header/banner (click-scroll landing). Manual scroll-spy direction hysteresis was superseded by PROFILE-004’s single near-chrome reading line.

### Steps to reproduce
1. Sign in and open `/profile` with enough content to scroll between «Особисті дані», «Дивізіони», and «Сповіщення».
2. Click a lower left-nav item (e.g. «Дивізіони») and note where the section heading lands under the top of the viewport.
3. Scroll upward slowly through sections and watch when the active menu item switches to the previous section.

**Expected:** Menu/hash scroll places the section heading just below fixed `.app-top-chrome` (header + optional HintPanel / «панель підказки») plus comfort pad. Scrolling up should keep the current section active until its heading approaches that same near-top line, not flip while the heading is still mid-viewport.
**Actual:** Fixed `scroll-margin-top: 5rem` (80px) left headings too far down after window scroll because PublicHeader and the onboarding banner were not sticky and scrolled away. The spy used `max(headerBottom + 24, innerHeight / 2)`, so scrolling up deactivated the current section as soon as its heading crossed mid-viewport.

## PROFILE-004 · Manual scroll-spy skipped Divisions between Profile and Notifications

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/lib/profileNavigation.ts`, `src/client/pages/ProfilePage.tsx` (spy only; click-scroll offset unchanged)
**Coverage:** `src/client/lib/profileNavigation.test.ts` — `PROFILE-004` single near-chrome reading line equals click landing; classic “last top ≤ reading line” selection across profile/divisions/notifications tops (aside actions are not in the spy set; see PROFILE-009); Divisions wins when the line sits between divisions top and notifications top

### Steps to reproduce
1. Sign in and open `/profile` with Profile, Divisions, and Notifications sections tall enough to scroll.
2. Manually scroll down from the top through «Особисті дані» → «Дивізіони» → «Сповіщення» and watch the left-nav active item.
3. Scroll back up through the same band.

**Expected:** At `scrollY ≈ 0`, «Особисті дані» is active. While the near-chrome reading line sits between `#my-divisions` and `#my-notifications` tops, «Дивізіони» stays active for a clear range (both directions). Notifications activate only once their heading reaches that same near-chrome line — not as soon as the block enters mid-viewport.
**Actual:** Downward spy used a ~40% viewport reading line (upward used near-chrome). Notifications’ top crossed the mid line while Divisions never uniquely owned it, so Divisions was skipped entirely; Profile felt sticky at the top and Notifications activated early.

## PROFILE-005 · Expanding membership panels shifted the hex background

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/components/PublicAtmosphere.tsx`, `.public-surface` / `__wash` / `__grid` in `src/client/styles.css`
**Coverage:** `src/client/components/PublicAtmosphere.test.ts` — `PROFILE-005` wash/hex are siblings outside `.public-surface` (not nested under the overflowing content shell). Manual: on `/profile`, toggle «я член ФПСУ» / IPSC / discipline expanders and scroll a long profile — hex + gradient wash stay viewport-stable; translucent `--panel-bg` panels and fixed `.app-top-chrome` (hint panel spacer) still work; window scroll only (no scrolling `.public-surface`).

### Steps to reproduce
1. Open `/profile` (or registration profile step) with the hex atmosphere visible behind translucent panels.
2. Toggle «я член ФПСУ» so membership fields expand (or expand IPSC / discipline blocks).
3. Watch the large hex pattern (and accent wash) while the panel height changes.

**Expected:** Content/panels grow or collapse; the hex grid and gradient wash stay locked to the viewport (no translate/re-center). Fixed chrome («панель підказки») and window scrolling behave as before (PROFILE-002).
**Actual:** `.public-surface__grid` was `position: absolute; inset: -8%` inside `.public-surface` (`min-height: 100dvh`, grows with content). Expanding panels lengthened the shell, so `background-position: center` and the %-based mask re-centered the hex; the shell’s own %-based gradient wash shifted with it.

## PROFILE-006 · Profile validation banner without field highlight

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/components/ProfileForm.tsx`, `src/client/lib/profileFormValidation.ts`, `DateField`, `authApi` `field` plumbing
**Coverage:** `src/client/components/ProfileControls.test.ts` — PROFILE-006 client validation returns the offending field key(s) for gender/birthDate pair, name alphabet, and enabled-without-division; server `field` maps onto highlight keys. Manual: on `/profile` edit, fill only gender (or only birth date) and Save — the empty partner field is highlighted, focus moves there, and the banner explains the pair rule (not only the generic «Перевірте правильність…»).

### Steps to reproduce
1. Open `/profile`, edit the profile section.
2. Select gender without a birth date (or the reverse) and press Save.
3. Observe the red banner and whether any control shows an error border.

**Expected:** Banner names the concrete rule when possible; the invalid control(s) get `is-invalid` / `aria-invalid` and receive focus.
**Actual:** Client checks set only a generic `invalid_profile` banner string and never marked fields, so nothing looked invalid.

## PROFILE-007 · Onboarding HintPanel blocked profile Edit

**Status:** Fixed (uncommitted working tree)
**Area:** `.app-top-chrome` / `.app-top-chrome__hint` in `src/client/styles.css`, `PublicChrome`, `HintPanel`
**Coverage:** Not covered by automated tests — pointer-hit geometry is CSS-only (`pointer-events` on `.app-top-chrome`). Manual: on `/profile` with an onboarding HintPanel visible (e.g. disciplines «Додайте свій дивізіон…» + «Пропустити»), confirm the profile section pencil Edit is clickable; Skip on the hint, logo, and avatar/user menu still work.

### Steps to reproduce
1. Sign in with a session that still shows a profile onboarding HintPanel and open `/profile` near the top of the page.
2. With the centered hint visible, click the profile section Edit (pencil) control in `.profile-summary__header`.

**Expected:** Edit opens the profile section editor. Hint Skip / logo / avatar menu remain usable.
**Actual:** Fixed `.app-top-chrome` kept default `pointer-events` on its full pin box, so empty gutters beside the centered hint (and the hint slot itself) intercepted clicks meant for the Edit button underneath.

## PROFILE-008 · Male gender saved as empty when birth date missing

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/lib/profileFormValidation.ts` (`genderBirthForClientSave`), `ProfileSummary` view
**Coverage:** `src/client/components/ProfileControls.test.ts` — `PROFILE-008` persists `male` and `female` independently of birth date; empty gender still fills male only when a birth date is present. Manual: on `/profile` edit, leave «Чоловіча» selected, clear birth date, Save — view mode shows «Чоловіча», not «—».

### Steps to reproduce
1. Open `/profile`, edit personal details.
2. Leave gender on «Чоловіча» (UI default) and clear the birth date (or never set one).
3. Save, then view the section.

**Expected:** Summary shows «Чоловіча» (same as the selected radio). Gender and birth date are independently optional.
**Actual:** `genderBirthForClientSave` stripped `male` when birth date was empty (to avoid persisting the UI default) while still allowing `female`, so the API stored `gender: null` and the summary rendered «—».

## PROFILE-009 · Sticky aside + `#profile-actions` collapsed scroll-spy to two states

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/hooks/useProfileScrollSpy.ts`, `src/client/components/ProfileAside.tsx`, `.profile-aside` sticky CSS
**Coverage:** `src/client/lib/profileNavigation.test.ts` — spy fixtures use only `my-profile` / `my-divisions` / `my-notifications`; document-end selects notifications (not actions). Manual: scroll `/profile` through all three main sections — URL hash cycles with the reading line; identity + security cards scroll away with the page (no in-page aside submenu).

### Steps to reproduce
1. Sign in and open `/profile` with enough content to scroll past personal details, divisions, and notifications.
2. Scroll down slowly and watch the URL hash.
3. Note whether the right column stays pinned while scrolling.

**Expected:** Hash cycles `#my-profile` → `#my-divisions` → `#my-notifications`. Aside cards (avatar, security) scroll with the page. Actions are not a scroll-spy target.
**Actual:** Sticky `.profile-aside` kept `#profile-actions` near the reading line, so the spy jumped between `#my-profile` and `#profile-actions` and skipped divisions/notifications. Actions were incorrectly in `PROFILE_ANCHORS`.

## PROFILE-010 · Document-end override skipped Divisions while it owned the reading line

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/lib/profileNavigation.ts` (`resolveActiveProfileAnchor`)
**Coverage:** `src/client/lib/profileNavigation.test.ts` — `PROFILE-010` at document end keeps `my-divisions` when it owns the reading line; runway force-last only when the reading-line winner is still the first section and last.top > reading line.

### Steps to reproduce
1. Sign in and open `/profile` with personal details, divisions, and notifications tall enough to scroll (aside not sticky).
2. Scroll until «Дивізіони» sits under the topbar reading line while «Сповіщення» is still below it.
3. If the viewport is near the document bottom (`scrollY + innerHeight ≈ scrollHeight`), watch the URL hash.

**Expected:** `#my-divisions` stays active for that band (same as when not at document end).
**Actual:** `atDocumentEnd` always forced the last spy section (`#my-notifications`), so divisions never highlighted on short/medium pages once the page bottom was in view.

## AUTH-003 · Profile black screen after phone change (`useBlocker` crash)

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/hooks/useUnsavedDiscard.ts`, `src/client/hooks/useNavigationBlocker.ts`, `src/client/main.tsx` (`BrowserRouter`)
**Coverage:** `src/client/hooks/useNavigationBlocker.test.ts` — navigator patch defers push/replace/go and allows one proceed retry. Manual: complete `/change-phone` → redirected to `/login` with phone-changed hint (no console `useBlocker must be used within a data router`).

### Steps to reproduce
1. Sign in locally and open `/change-phone`.
2. Complete the flow until the phone is updated.
3. Confirm redirect to `/login` with the success hint (not a dedicated done step or `/profile`).

**Expected:** Login page with the phone-changed hint; no `useBlocker` crash when navigating onward.
**Actual (before fix):** `ProfilePage` called `useBlocker` from `useUnsavedDiscard`, which requires a data router; `main.tsx` intentionally keeps `BrowserRouter` to avoid AUTH-002 Navigate loops. React threw on mount → blank/black screen.

## AUTH-004 · Phone-change success lost login notice

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/pages/ChangePhonePage.tsx`, `src/client/App.tsx` (`RequireAuth`), `src/client/lib/authNotice.ts`
**Coverage:** `src/client/lib/authNotice.test.ts` — notice-over-`next=` redirect preference and one-shot consume

### Steps to reproduce
1. Sign in locally and complete `/change-phone` until the new number is saved.
2. Observe the post-success redirect while still on `/change-phone` before any explicit login navigation.

**Expected:** `/login?notice=phone_changed` with the phone-changed hint banner.
**Actual:** `setAccount(null)` while still on `/change-phone` made `RequireAuth` redirect to `/login?next=%2Fchange-phone` first, so the intended notice URL never ran and the hint did not appear.

## AUTH-005 · Notifications Save left email onboarding open

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/pages/ProfilePage.tsx` (`handleNotificationsSaved`), `src/client/components/NotificationChannelsForm.tsx`, `computeOnboardingStep`
**Coverage:** `src/worker/identity/routes.test.ts` — `AUTH-005` password reset preserves `email_prompt_dismissed_at` / `accounts.email` and `onboardingStep: null` after re-login. Manual: on `/profile` with `onboardingStep === "email"`, press Save without entering email (SMS default) → banner clears; after forgot-password → login, email hint does not return.

### Steps to reproduce
1. Sign in and advance onboarding to the email/notifications step (`onboardingStep === "email"`).
2. On «Сповіщення», leave SMS as the default channel, do not enter an email, and press Save (not Skip).
3. Sign out or complete forgot-password, then sign in again.

**Expected:** Save completes the email onboarding step (same as Skip or saving an email). `onboardingStep` is `null` before and after password reset; `POST /api/auth/password/reset` does not clear `email_prompt_dismissed_at` or `accounts.email`.
**Actual:** Save exited edit mode but never called `dismissEmailPrompt` when no email was persisted, so `email_prompt_dismissed_at` stayed `NULL` and `accounts.email` stayed `NULL`. Password reset was unrelated (it only updates password hash / sessions); re-login still showed the email onboarding hint because the step had never been marked done.

## SHELL-001 · Mobile content width jumps (scrollbar gutter)

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/styles.css` (`html { scrollbar-gutter: stable }` + `--removed-scrollbar-width` padding/topbar), `src/client/lib/scrollLock.ts` / `useSidebarScrollLock` (AccountShell), `body.sidebar-open { overflow: hidden }` in `gentelella.css`
**Coverage:** Unit — `scrollLock.test.ts` covers gap math. Visual assert still needed on &lt;768px (classic vs overlay scrollbars / DOM lock).

### Steps to reproduce
1. Sign in on a viewport &lt;768px wide.
2. Compare horizontal inset of content cards on `/profile` (tall, usually scrollable) vs `/matches`.
3. On either page, open the mobile sidebar and watch the main column.

**Expected:** Profile and Matches share the same content-block horizontal inset; opening the drawer does not shift content sideways.
**Actual:** Tall Profile reserved a classic scrollbar while short Matches often did not, so Profile looked more inset on the right. Opening the drawer set `body.sidebar-open { overflow: hidden }`, removed the scrollbar, and the content expanded (~6–15px jump). `scrollbar-gutter: stable` alone is insufficient on Safari/macOS when the gutter is ignored or overlay scrollbars still interact with `overflow: hidden` differently — fix measures `clientWidth` before/after lock and sets `--removed-scrollbar-width` only when the gap is &gt; 0 (avoids double-padding when gutter already works).

## SHELL-002 · Overlay scrims were slate-blue

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/styles.css` (`--overlay-scrim`; `.sidebar-backdrop`, `.modal-backdrop`, `.cmdk-backdrop`, `.drawer-backdrop`), override of Gentelella `rgba(15, 23, 42, …)` / `rgba(15, 22, 35, …)`
**Coverage:** Not covered — brand color token; manual visual check.

### Steps to reproduce
1. On &lt;768px, open the account sidebar drawer — or trigger any `AppDialog` (e.g. Profile unsaved-changes confirm).
2. Observe the scrim behind the panel / dialog.

**Expected:** Neutral black/carbon-derived overlay (`--overlay-scrim`) aligned with Squad Me chrome, shared across sidebar and modals.
**Actual:** Bluish slate overlay from Gentelella leftovers (`rgba(15, 23, 42, 0.4–0.45)` on sidebar/modal; same family on unused `.cmdk-backdrop` / `.drawer-backdrop`).

## SHELL-003 · Mobile drawer footer stacks when rail preference set

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/styles.css` (`body.sidebar-rail .sidebar-footer-row` and related footer rail rules)
**Coverage:** Not covered — CSS `@media (min-width: 769px)` layout; manual visual check.

### Steps to reproduce
1. On desktop (≥769px), collapse the sidebar to rail (`body.sidebar-rail`).
2. Resize the viewport to &lt;769px (sidebar hides).
3. Open the mobile drawer (`body.sidebar-open`).

**Expected:** Profile link and logout sit on one horizontal row (expanded drawer chrome).
**Actual:** Rail footer CSS (`flex-direction: column`, hidden logout label) still applied because `sidebar-rail` remained on `body` from the desktop preference, so logout stacked under profile.

## PROFILE-011 · Mobile Profile stacked identity before actions incorrectly

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/styles.css` (`.profile-page-layout` / `.profile-aside` at `max-width: 1100px`, aligned with Gentelella `.col-8-4`), `src/client/components/ProfileAside.tsx`
**Coverage:** Not covered — CSS flex `order` + `display: contents`; manual DOM/visual order on ≤1100px (including mid-range 769–1100).

### Steps to reproduce
1. Sign in and open `/profile` at ≤1100px width (e.g. 900px or &lt;768px).
2. Scroll the page from top to bottom.

**Expected:** Visual order is avatar/identity → `#my-profile` → `#my-divisions` → `#my-notifications` → security actions card at the bottom. Above 1100px keeps two-column main | aside.
**Actual:** DOM was main column then aside (identity + actions together), so after the main sections the avatar and security still appeared as a pair — or identity sat with actions after content rather than avatar-first / actions-last. At 769–1100 the reorder previously did not apply (only &lt;768px).

## PROFILE-012 · Mobile Profile cards stay narrow left column

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/styles.css` (`.profile-page-layout` at `max-width: 1100px`, same breakpoint as PROFILE-011 / Gentelella `.col-8-4`)
**Coverage:** Not covered — CSS layout; manual visual check on ≤1100px vs Matches full-width cards.

### Steps to reproduce
1. Sign in and open `/profile` at ≤1100px width (after PROFILE-011 reorder), including mid-range 769–1100.
2. Observe personal / divisions / notifications / security cards.

**Expected:** Cards fill available content width in a single stacked column (Matches-style).
**Actual:** Cards stayed a narrow left strip (~40–50% width) with empty space on the right — base `align-items: start` on the flex column prevented cross-axis stretch after `display: contents` + flex reorder. Stretch previously only applied under &lt;768px.

## PROFILE-013 · Membership / discipline toggles did not mark the form dirty

**Status:** Fixed (uncommitted working tree)
**Area:** `ProfileDetailsForm.tsx`, `DivisionsForm.tsx` (`CollapsibleToggleBlock` switch → `markDirty`)
**Coverage:** Not covered by DOM click tests (suite is `renderToStaticMarkup`). Manual: edit `/profile`, flip UPSF/IPSC or a discipline switch only, press Cancel (header or footer) — unsaved-changes dialog opens; Stay keeps edits, Discard exits edit mode.

### Steps to reproduce
1. Sign in, open `/profile`, press Edit on personal details (or Divisions).
2. Toggle only «я член ФПСУ» / IPSC / a discipline enable switch (do not type in other fields).
3. Press Скасувати (card header or form footer).

**Expected:** Form is dirty after the toggle; Cancel opens the unsaved-changes confirmation.
**Actual:** Switch is a `button[role=switch]`, so it never fired the form’s `onChange={markDirty}` path used by native inputs. Dirty stayed false and Cancel exited edit mode immediately with no dialog.

## PROFILE-014 · Field hint tooltip clipped by membership panel

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/components/FieldHint.tsx`, `src/client/styles.css` (`.hint-pop` portal), `.profile-form__panel { overflow: hidden }`
**Coverage:** `src/client/components/FieldHint.test.ts` — PROFILE-014 asserts `hint-pop--portal` + tooltip role. Manual: on `/profile` edit UPSF «Місто» (i), full text «Для реєстрації на чемпіонати міст.» visible beyond panel edge.

### Steps to reproduce
1. Sign in, open `/profile`, edit personal details with UPSF membership enabled.
2. Hover or click the (i) next to «Місто» (right column inside the membership panel).

**Expected:** Full hint text is readable (not cut off by the panel border).
**Actual:** Absolute `.hint-pop` stayed inside `.profile-form__panel` (`overflow: hidden`), so the right-side tooltip was clipped mid-sentence.
