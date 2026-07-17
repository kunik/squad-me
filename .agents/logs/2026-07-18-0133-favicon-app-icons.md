# Favicon and app icons

## Summary
Added brand mark favicon and mobile/PWA icon set from the Squad Me logo mark, wired into `index.html` and `site.webmanifest`.

## Key decisions
- SVG mark (`favicon.svg` / `logo-mark.svg`) is the source; PNG sizes generated for browsers and home-screen installs.
- Separate maskable icons with safe-zone padding for Android adaptive icons.
- Coming-soon page keeps full wordmark; browser/OS chrome uses the mark only.

## Files changed
- `index.html` — favicon, apple-touch, theme-color, web-app meta, manifest link
- `public/favicon.svg`, `public/logo-mark.svg`, `public/favicon.ico`
- `public/favicon-16x16.png`, `public/favicon-32x32.png`
- `public/apple-touch-icon.png`
- `public/icon-192.png`, `public/icon-512.png`
- `public/icon-maskable-192.png`, `public/icon-maskable-512.png`
- `public/site.webmanifest`

## Verification
- Generated icons visually checked at 32 and 192; mark and brand colors match source logo.
