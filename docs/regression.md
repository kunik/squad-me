# Regression Specifications

Record each distinct bug with reproducible behavior and its test coverage.

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
2. Click «Мої дивізіони» in the left profile menu.
3. Observe the viewport and active menu item near the document-bottom boundary.

**Expected:** The visible `#my-divisions` block is scrolled into view and remains active; its independent Edit/Save/Cancel flow saves `section: "disciplines"` without changing upper-profile fields.
**Actual:** Profile and divisions anchors were buried under separate form/summary wrappers rather than being direct content-section siblings. More importantly, the tall profile left too little scroll runway for the divisions top to reach the header reading line; at maximum scroll the final-section override selected actions, so manual scrolling jumped directly from profile to actions and never activated divisions. The animation-frame scroll throttle could also remain pending and stop later scroll events from recalculating the active anchor. On short layouts, `scrollY = 0` also satisfied the document-end condition, so Actions overrode Profile even at the page top.

## PROFILE-002 · Skip onboarding scrolled header out of reach

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/pages/ProfilePage.tsx`, `src/client/lib/profileNavigation.ts`, `.public-surface` overflow
**Coverage:** `src/client/lib/profileNavigation.test.ts` — `PROFILE-002` step-advance anchors are `my-divisions` (profile→disciplines) and `my-notifications` (disciplines→email); window scroll-top helper clamps so `scrollY = 0` stays reachable (menu/Skip/Save must use that path, not `scrollIntoView`). Manual: on `/profile` with `onboardingStep === "profile"`, press Skip (or Save), confirm banner advances to disciplines, «Мої дивізіони» becomes active, divisions section opens in edit mode, and the page scrolls after the edit form lays out (not while still on the short summary); then Skip/Save divisions → email, «Мої сповіщення» active, window scrolls with scroll-margin, and scrolling back to `scrollY = 0` still shows PublicHeader/logo.

### Steps to reproduce
1. Sign in with a session that still needs the profile onboarding step and open `/profile` near the top of the page.
2. Press Skip on the HintPanel («панель підказки») so the step advances from profile → disciplines (then Skip again → email/notifications).
3. Try to scroll up to see the Squad Me logo in `PublicHeader`.

**Expected:** Banner advances profile → disciplines → email. Each Skip/Save activates the matching left-nav item via the same handler as a menu click (queued nav + window-only scroll with scroll-margin). Profile→disciplines also opens the divisions block in edit mode before scrolling, so the taller edit layout can leave `scrollY = 0` and the spy does not snap back to «Мій профіль». At `scrollY = 0` the full header/logo remains visible; scroll-spy selects «Мій профіль» at the page top.
**Actual:** After Skip, `reloadAfterStep` auto-scrolled to `#my-notifications` via `Element.scrollIntoView`. Because `.public-surface` uses `overflow: hidden` (a scroll container), that scroll moved the header out of the clipped shell while window `scrollY` stayed near zero, so the logo could not be recovered by scrolling up. A later over-correction removed Skip navigation entirely instead of routing it through the menu handler. A follow-on race also scrolled to `#my-divisions` before the divisions edit form opened (and refetched profile on every step change), so the menu highlight did not stick and edit mode did not reliably appear.

## PROFILE-003 · Profile menu scroll overshot; upward spy flipped early

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/pages/ProfilePage.tsx`, `src/client/lib/profileNavigation.ts`, `.profile-page__anchor` scroll-margin
**Coverage:** `src/client/lib/profileNavigation.test.ts` — `PROFILE-003` sticky-chrome offset ignores in-flow header/banner (click-scroll landing). Manual scroll-spy direction hysteresis was superseded by PROFILE-004’s single near-chrome reading line.

### Steps to reproduce
1. Sign in and open `/profile` with enough content to scroll between «Мій профіль», «Мої дивізіони», and «Мої сповіщення».
2. Click a lower left-nav item (e.g. «Мої дивізіони») and note where the section heading lands under the top of the viewport.
3. Scroll upward slowly through sections and watch when the active menu item switches to the previous section.

**Expected:** Menu/hash scroll places the section heading just below fixed `.app-top-chrome` (header + optional HintPanel / «панель підказки») plus comfort pad. Scrolling up should keep the current section active until its heading approaches that same near-top line, not flip while the heading is still mid-viewport.
**Actual:** Fixed `scroll-margin-top: 5rem` (80px) left headings too far down after window scroll because PublicHeader and the onboarding banner were not sticky and scrolled away. The spy used `max(headerBottom + 24, innerHeight / 2)`, so scrolling up deactivated the current section as soon as its heading crossed mid-viewport.

## PROFILE-004 · Manual scroll-spy skipped Divisions between Profile and Notifications

**Status:** Fixed (uncommitted working tree)
**Area:** `src/client/lib/profileNavigation.ts`, `src/client/pages/ProfilePage.tsx` (spy only; click-scroll offset unchanged)
**Coverage:** `src/client/lib/profileNavigation.test.ts` — `PROFILE-004` single near-chrome reading line equals click landing; classic “last top ≤ reading line” selection across profile/divisions/notifications/actions tops; Divisions wins when the line sits between divisions top and notifications top

### Steps to reproduce
1. Sign in and open `/profile` with Profile, Divisions, and Notifications sections tall enough to scroll.
2. Manually scroll down from the top through «Мій профіль» → «Мої дивізіони» → «Мої сповіщення» and watch the left-nav active item.
3. Scroll back up through the same band.

**Expected:** At `scrollY ≈ 0`, «Мій профіль» is active. While the near-chrome reading line sits between `#my-divisions` and `#my-notifications` tops, «Мої дивізіони» stays active for a clear range (both directions). Notifications activate only once their heading reaches that same near-chrome line — not as soon as the block enters mid-viewport.
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
