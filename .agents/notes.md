# Project Notes

Store concise operational facts that are useful in future sessions but cannot
be derived reliably from source code, documentation, or git history.

<!-- Add entries below. -->

- Cloudflare account Taras (`2758c21b02e5c7efcfa745cb49948ace`); use
  `npx wrangler`. Full infra steps: `docs/provision.md`.
- Zone `squadme.app` on account: ID `c224b051f2d19f3900b68c0d69ffb3c6`,
  status `active`, NS `barbara`/`miguel.ns.cloudflare.com` (registrar was
  Namecheap). Account `workers.dev` subdomain: `squad-me`.
- Cloud Dev provisioned + deployed: Worker `squad-me-dev-app`, custom domain
  `dev.squadme.app` attached (see `docs/inventory-dev.md`). Free plan: no
  `limits.cpu_ms` on `env.dev` or `env.production` (parity; re-add when
  Workers Paid). Still open: Access on Dev, secrets, GitHub Environments.
  Production apex/custom domain and `squad-me-production-*` resources not done.
- Client landing is a brand coming-soon stub (`src/client/App.tsx` +
  `styles.css`). Logo: `public/logo-full.svg` from KB
  `products/match-platform/design/completed/brand/`. Palette from
  `specs/brand-brief.md` / `design/principles.md` (dark neutral + tactical
  orange `#E8823C`). Landing display font Barlow Condensed (not Inter).
