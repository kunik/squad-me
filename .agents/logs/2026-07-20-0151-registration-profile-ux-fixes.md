# Registration/profile UX fixes

## Scope

Implemented the prioritized registration and profile audit fixes without
committing.

## Durable outcomes

- Register-purpose OTP remains password-reset authority for an existing phone.
  Account existence is disclosed only after successful OTP verification via
  `accountMode`; reset updates the password, signs in, and revokes other sessions.
- Registration nickname bootstrap now uses `section: "nickname"`, preserving
  every other existing profile field and `profile_completed_at` (`AUTH-001`).
- Register and forgot-password use the shared top `FlowStatus` hint-bar pattern
  for progress and contextual guidance, aligned with the future match-reserve
  status surface.
- Turnstile client wiring loads the managed widget only when the public site key
  is configured through `GET /api/auth/config`; local blank-key behavior keeps
  the existing no-op development verifier.
- Auth/profile network failures no longer silently clear session/profile state;
  submit controls recover through `finally`, and localized retry/error copy is
  shown.
- Profile read-only state uses semantic values and Yes/No statuses, edit blocks
  have disclosure chevrons, profile fields are optional, and dirty edits are
  guarded across Skip, cancel, menu changes, browser navigation, and unload.
- Empty email Save is an error; Skip remains a separate explicit action.
- The profile rail menu is unframed and ordered for matches, linked shooters,
  profile, divisions, notifications, and profile actions. Stable anchors use
  smooth scrolling; identity and divisions are separate page sections with
  independent Edit/Save/Cancel, dirty state, and safe aggregate section merges.
  A sticky-header-aware scroll spy highlights exactly one current anchor during
  manual/smooth scrolling and keeps the URL hash synchronized via replace.
- Profile actions link to the supported OTP password reset. Profile deletion is
  visibly unavailable (`Coming soon`) because no deletion/cascade API exists.
- The small header avatar now reuses the left-rail avatar's accent ring and
  shadow treatment with a thinner 1px ring at header scale. Its dropdown now
  retains the simpler pre-polish markup and styling after the more elaborate
  redesign was rejected; identity, language/profile/logout behavior,
  click-outside/Escape, and viewport-safe width remain.

## Verification

- `npm run typecheck` — passed
- `npm test` — 7 files, 93 tests passed
- `npm run build` — passed
- IDE diagnostics — no errors
- Browser smoke — registration status bar rendered and `/profile` auth redirect worked
