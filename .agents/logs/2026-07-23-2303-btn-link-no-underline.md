# Button links: no hover underline

## Summary
`<Link className="btn …">` (e.g. profile aside «Змінити номер телефону»)
picked up global `a:hover { text-decoration: underline }`. Cleared underline
for button-styled links.

## Key decisions
- Fix in shared `.btn` / `a.btn:hover|:focus` rather than per-page overrides.

## Files changed
- `src/client/gentelella.css` — `text-decoration: none` on `.btn` and `a.btn:hover|:focus`

## Verification
- Visual: profile aside outline buttons no longer underline on hover

## Pending
- Other unstaged working-tree changes (auth-exit, FieldHint portal, etc.) left out
