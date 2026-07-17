#!/usr/bin/env bash
# Attach apex custom domain squadme.app to squad-me-production-app.
# Wrangler OAuth can deploy the Worker but cannot edit zone DNS; when the apex
# already has externally managed A/AAAA/CNAME records, deploy fails with API
# 100117. This script clears those conflicts, then attaches the domain.
#
# Requires CLOUDFLARE_API_TOKEN with at least:
#   - Zone → DNS → Edit (zone squadme.app)
#   - Account → Workers Scripts → Edit
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   npm run attach:production:hostname
#
# Safer one-off alternative (no token): Dashboard → DNS → delete A/AAAA/CNAME
# for exact name squadme.app (keep TXT/MX), then npm run deploy:production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2758c21b02e5c7efcfa745cb49948ace}"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-c224b051f2d19f3900b68c0d69ffb3c6}"
HOSTNAME="${PRODUCTION_HOSTNAME:-squadme.app}"
SERVICE="${PRODUCTION_WORKER:-squad-me-production-app}"
API="https://api.cloudflare.com/client/v4"
INVENTORY="docs/inventory-production.md"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is required (Wrangler OAuth lacks Zone DNS Edit)."
  echo "Create a token: https://dash.cloudflare.com/profile/api-tokens"
  echo "Scopes: Zone DNS Edit (squadme.app); Account Workers Scripts Edit"
  echo "Then: export CLOUDFLARE_API_TOKEN=... && npm run attach:production:hostname"
  echo ""
  echo "Or manually: Dashboard → DNS → delete A/AAAA/CNAME for ${HOSTNAME}, then:"
  echo "  npm run deploy:production"
  exit 1
fi

cf() {
  local method="$1" path="$2"
  shift 2
  curl -sS -X "$method" "${API}${path}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

echo "==> Listing DNS records for ${HOSTNAME} (zone ${ZONE_ID})"
DNS_JSON="$(cf GET "/zones/${ZONE_ID}/dns_records?per_page=100&name=${HOSTNAME}")"
if ! node -e "const j=JSON.parse(process.argv[1]); if(!j.success){console.error(JSON.stringify(j.errors||j,null,2)); process.exit(1)}" "$DNS_JSON"; then
  echo "Token cannot read zone DNS. Need Zone → DNS → Edit on ${HOSTNAME}."
  exit 1
fi

echo "==> Deleting conflicting A/AAAA/CNAME for exact hostname ${HOSTNAME}"
IDS="$(node -e "
const j=JSON.parse(process.argv[1]);
const host=process.argv[2];
const conflict=new Set(['A','AAAA','CNAME']);
const rows=(j.result||[]).filter(r=>r.name===host && conflict.has(r.type));
if (!rows.length) process.exit(0);
for (const r of rows) {
  console.error('    '+r.type+' '+r.name+' → '+r.content);
  console.log(r.id);
}
" "$DNS_JSON" "$HOSTNAME")"
if [[ -z "${IDS}" ]]; then
  echo "    none (already clear)"
else
  while IFS= read -r RID; do
    [[ -z "$RID" ]] && continue
    DEL="$(cf DELETE "/zones/${ZONE_ID}/dns_records/${RID}")"
    node -e "const j=JSON.parse(process.argv[1]); if(!j.success){console.error(JSON.stringify(j.errors||j,null,2)); process.exit(1)}; console.log('    deleted', process.argv[2])" "$DEL" "$RID"
  done <<< "${IDS}"
fi

echo "==> Attaching Worker custom domain ${HOSTNAME} → ${SERVICE}"
ATTACH="$(
  node -e "console.log(JSON.stringify({hostname:process.argv[1],service:process.argv[2],environment:'production',zone_id:process.argv[3]}))" \
    "$HOSTNAME" "$SERVICE" "$ZONE_ID" \
  | cf PUT "/accounts/${ACCOUNT_ID}/workers/domains" --data @-
)"
if ! node -e "const j=JSON.parse(process.argv[1]); if(!j.success){console.error(JSON.stringify(j.errors||j,null,2)); process.exit(1)}; console.log('    ok', JSON.stringify(j.result))" "$ATTACH"; then
  echo "Attach failed. If API still reports 100117, re-check apex A/AAAA/CNAME in Dashboard DNS."
  exit 1
fi

if [[ -f "${INVENTORY}" ]]; then
  node --input-type=module -e "
import fs from 'node:fs';
const path='${INVENTORY}';
let t=fs.readFileSync(path,'utf8');
t=t.replace(
  /- \[ \] Attach custom domain \`squadme\.app\`.*/,
  '- [x] Attach custom domain \`squadme.app\` (\`npm run attach:production:hostname\`)'
);
fs.writeFileSync(path,t);
"
  echo "==> Updated ${INVENTORY} checklist"
fi

echo "Done. Verify:"
echo "  curl -sS https://${HOSTNAME}/api/health"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' https://${HOSTNAME}/"
