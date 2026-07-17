#!/usr/bin/env bash
# Attach apex custom domain squadme.app to squad-me-production-app.
# Wrangler OAuth can deploy the Worker but cannot edit zone DNS; when the apex
# already has externally managed A/AAAA/CNAME records, deploy fails with API
# 100117. This script clears those conflicts, then attaches the domain.
#
# CF-managed read-only AAAA (often content 100::) returns API 1043 on DELETE —
# that means Workers already owns the apex; skip and verify instead of failing.
#
# Requires API token with at least:
#   - Zone → DNS → Edit (zone squadme.app)
#   - Account → Workers Scripts → Edit
# Prefer CLOUDFLARE_API_TOKEN_DNS in .env.cloudflare (see .env.cloudflare.example).
#
# Usage:
#   cp .env.cloudflare.example .env.cloudflare   # once; paste DNS token locally
#   npm run attach:production:hostname
#   ATTACH_DRY_RUN=1 npm run attach:production:hostname   # list planned deletes only
#
# Safer one-off alternative (no token): Dashboard → DNS → delete A/AAAA/CNAME
# for exact name squadme.app (keep TXT/MX), then npm run deploy:production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=lib/common.sh
source "${ROOT}/infra-setup/lib/common.sh"

require_api_token "apex DNS attach (Zone DNS Edit + Workers Scripts Edit)" dns

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2758c21b02e5c7efcfa745cb49948ace}"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-c224b051f2d19f3900b68c0d69ffb3c6}"
HOSTNAME="${PRODUCTION_HOSTNAME:-squadme.app}"
SERVICE="${PRODUCTION_WORKER:-squad-me-production-app}"
API="https://api.cloudflare.com/client/v4"
INVENTORY="docs/inventory-production.md"
DRY_RUN="${ATTACH_DRY_RUN:-0}"

cf() {
  local method="$1" path="$2"
  shift 2
  curl -sS -X "$method" "${API}${path}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

# Returns 0 if DELETE JSON is success, or errors include code 1043 (read-only CF-managed).
dns_delete_ok_or_skip() {
  node -e '
const j = JSON.parse(process.argv[1]);
const rid = process.argv[2];
if (j.success) {
  console.log("    deleted", rid);
  process.exit(0);
}
const errs = j.errors || [];
const readonly = errs.some((e) => e && (e.code === 1043 || String(e.code) === "1043"));
if (readonly) {
  console.log("    skip read-only (API 1043)", rid, "— CF-managed / Workers apex");
  process.exit(0);
}
console.error(JSON.stringify(errs.length ? errs : j, null, 2));
process.exit(1);
' "$1" "$2"
}

# Exit 0 if attach JSON succeeded.
attach_succeeded() {
  node -e '
const j = JSON.parse(process.argv[1]);
if (j.success) {
  console.log("    ok", JSON.stringify(j.result));
  process.exit(0);
}
console.error(JSON.stringify(j.errors || j, null, 2));
process.exit(1);
' "$1"
}

# Exit 0 if Workers domains list shows HOSTNAME → SERVICE. Soft-fail on API auth.
domain_mapped_to_service() {
  local list
  list="$(cf GET "/accounts/${ACCOUNT_ID}/workers/domains")"
  node -e '
const j = JSON.parse(process.argv[1]);
const host = process.argv[2];
const service = process.argv[3];
if (!j.success) process.exit(2);
const hit = (j.result || []).find(
  (d) => d.hostname === host && d.service === service
);
if (!hit) process.exit(1);
console.log("    workers domain:", hit.hostname, "→", hit.service, hit.id || "");
' "$list" "$HOSTNAME" "$SERVICE"
}

verify_https_health() {
  local code body
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "https://${HOSTNAME}/" || true)"
  body="$(curl -sS --max-time 20 "https://${HOSTNAME}/api/health" || true)"
  [[ -z "${code}" ]] && code="000"
  ok "HTTPS / → HTTP ${code}"
  if [[ "${code}" != "200" ]]; then
    die "HTTPS health check failed (expected 200 on https://${HOSTNAME}/)"
  fi
  if echo "${body}" | grep -q '"environment"[[:space:]]*:[[:space:]]*"production"'; then
    ok "/api/health → environment=production"
  else
    die "Unexpected /api/health body (want environment=production): ${body:-"(empty)"}"
  fi
}

log "Listing DNS records for ${HOSTNAME} (zone ${ZONE_ID})"
DNS_JSON="$(cf GET "/zones/${ZONE_ID}/dns_records?per_page=100&name=${HOSTNAME}")"
if ! node -e "const j=JSON.parse(process.argv[1]); if(!j.success){console.error(JSON.stringify(j.errors||j,null,2)); process.exit(1)}" "$DNS_JSON"; then
  die "Token cannot read zone DNS. Need Zone → DNS → Edit on ${HOSTNAME}."
fi

log "Conflicting A/AAAA/CNAME for exact hostname ${HOSTNAME}"
PLAN="$(node -e "
const j=JSON.parse(process.argv[1]);
const host=process.argv[2];
const conflict=new Set(['A','AAAA','CNAME']);
const rows=(j.result||[]).filter(r=>r.name===host && conflict.has(r.type));
if (!rows.length) process.exit(0);
for (const r of rows) {
  const note = (r.content === '100::' || String(r.content).startsWith('100::'))
    ? ' (likely CF-managed Workers)'
    : '';
  console.error('    '+r.type+' '+r.name+' → '+r.content+note);
  console.log([r.id, r.type, r.content].join('\t'));
}
" "$DNS_JSON" "$HOSTNAME")"

if [[ -z "${PLAN}" ]]; then
  ok "none (already clear)"
else
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "ATTACH_DRY_RUN=1 — would DELETE the record(s) above (1043 skips still apply at run time)"
    ok "dry-run complete (no mutations)"
    exit 0
  fi
  while IFS=$'\t' read -r RID RTYPE RCONTENT; do
    [[ -z "${RID}" ]] && continue
    DEL="$(cf DELETE "/zones/${ZONE_ID}/dns_records/${RID}")"
    dns_delete_ok_or_skip "${DEL}" "${RID}"
  done <<< "${PLAN}"
fi

if [[ "${DRY_RUN}" == "1" ]]; then
  log "ATTACH_DRY_RUN=1 — would attach ${HOSTNAME} → ${SERVICE}"
  ok "dry-run complete (no mutations)"
  exit 0
fi

ATTACHED=0
log "Attaching Worker custom domain ${HOSTNAME} → ${SERVICE}"
ATTACH="$(
  node -e "console.log(JSON.stringify({hostname:process.argv[1],service:process.argv[2],environment:'production',zone_id:process.argv[3]}))" \
    "$HOSTNAME" "$SERVICE" "$ZONE_ID" \
  | cf PUT "/accounts/${ACCOUNT_ID}/workers/domains" --data @-
)"
if attach_succeeded "${ATTACH}"; then
  ATTACHED=1
else
  ok "attach API did not succeed — checking if already attached"
fi

log "Verifying Workers domain + HTTPS"
DOMAIN_EC=0
domain_mapped_to_service || DOMAIN_EC=$?
if [[ "${DOMAIN_EC}" -eq 0 ]]; then
  ATTACHED=1
  ok "custom domain mapped"
elif [[ "${DOMAIN_EC}" -eq 2 ]]; then
  ok "Workers domains list unavailable for this token (optional check skipped)"
else
  ok "Workers domains list has no ${HOSTNAME} → ${SERVICE} yet"
fi

# HTTPS is the source of truth when DNS is already Worker-managed (1043 / 100::).
verify_https_health
if [[ "${ATTACHED}" -eq 0 ]]; then
  ok "already attached (HTTPS production health OK; apex CF-managed)"
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
  log "Updated ${INVENTORY} checklist"
fi

echo "Done. Apex ${HOSTNAME} → ${SERVICE}."
