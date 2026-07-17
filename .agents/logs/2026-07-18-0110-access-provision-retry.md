# Access provision retry (dev)

- `npm run provision:access:dev` → exit **0**. API **10000 gone** (token works).
  - ZT org `squad-me.cloudflareaccess.com` present
  - App `squad-me-dev` id `6cc17162-60ea-435a-8557-424ef2695e55`
  - Policy `Allow Dev operators` (taras.kunch@gmail.com) present
  - Inventory updated by script
- `npm run provision:access:smoke:dev` → exit **0**
  - Service token `squad-me-gha-smoke` id `bfbff201-daee-49b8-a75b-ebe09e815c26` already exists
  - Policy `Allow CI smoke` present
  - Secret not re-shown (expected); wiring skipped unless `CF_ACCESS_CLIENT_SECRET` exported
- Curl `https://dev.squadme.app/api/health` (no session): **302** → `squad-me.cloudflareaccess.com/.../login` + `www-authenticate: Cloudflare-Access` (not bare 200)
- No commit
