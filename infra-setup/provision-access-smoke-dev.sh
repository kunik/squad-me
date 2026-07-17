#!/usr/bin/env bash
# Create Access service token + Service Auth policy for Cloud Dev CI smoke.
# Wrangler OAuth cannot manage Access — requires CLOUDFLARE_API_TOKEN with:
#   Access: Apps and Policies Edit
#   Access: Service Tokens Edit
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   npm run provision:access:smoke:dev
#
# Prints client_id / client_secret once. Wire into GitHub cloud-dev:
#   CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET
# (or: npm run ci:wire-secrets after exporting those + CLOUDFLARE_API_TOKEN)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2758c21b02e5c7efcfa745cb49948ace}"
APP_NAME="${ACCESS_APP_NAME:-squad-me-dev}"
HOSTNAME="${ACCESS_HOSTNAME:-dev.squadme.app}"
TOKEN_NAME="${ACCESS_SMOKE_TOKEN_NAME:-squad-me-gha-smoke}"
POLICY_NAME="${ACCESS_SMOKE_POLICY_NAME:-Allow CI smoke}"
API="https://api.cloudflare.com/client/v4"
INVENTORY="docs/inventory-dev.md"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is required (Wrangler OAuth lacks Access scopes)."
  echo "Create a token: https://dash.cloudflare.com/profile/api-tokens"
  echo "Scopes: Access: Apps and Policies Edit; Access: Service Tokens Edit"
  echo "Then: export CLOUDFLARE_API_TOKEN=... && npm run provision:access:smoke:dev"
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

echo "==> Resolving Access app ${APP_NAME} → ${HOSTNAME}"
APPS="$(cf GET "/accounts/${ACCOUNT_ID}/access/apps")"
APP_ID="$(node -e "
  const j=JSON.parse(process.argv[1]);
  if(!j.success){ console.error(JSON.stringify(j.errors||j,null,2)); process.exit(1) }
  const name=process.argv[2];
  const host=process.argv[3];
  const hit=(j.result||[]).find(a => a.name===name || a.domain===host ||
    (a.destinations||[]).some(d => d.uri===host || d.uri===host+'/'));
  if(!hit){ console.error('Access app not found. Run npm run provision:access:dev first.'); process.exit(1) }
  process.stdout.write(hit.id);
" "$APPS" "$APP_NAME" "$HOSTNAME")"
echo "    app id=${APP_ID}"

echo "==> Ensuring service token ${TOKEN_NAME}"
TOKENS="$(cf GET "/accounts/${ACCOUNT_ID}/access/service_tokens")"
EXISTING_ID="$(node -e "
  const j=JSON.parse(process.argv[1]);
  if(!j.success){ console.error(JSON.stringify(j.errors||j,null,2)); process.exit(1) }
  const name=process.argv[2];
  const hit=(j.result||[]).find(t => t.name===name);
  process.stdout.write(hit?.id || '');
" "$TOKENS" "$TOKEN_NAME")"

CLIENT_ID=""
CLIENT_SECRET=""
TOKEN_UUID=""

if [[ -n "$EXISTING_ID" ]]; then
  TOKEN_UUID="$EXISTING_ID"
  CLIENT_ID="$(node -e "
    const j=JSON.parse(process.argv[1]);
    const id=process.argv[2];
    const hit=(j.result||[]).find(t => t.id===id);
    process.stdout.write(hit?.client_id || '');
  " "$TOKENS" "$EXISTING_ID")"
  echo "    token already exists id=${TOKEN_UUID}"
  echo "    client_id is known; client_secret is NOT re-shown by Cloudflare."
  echo "    If you lost the secret: delete the token in Zero Trust → Service credentials,"
  echo "    then re-run this script."
  if [[ -z "${CF_ACCESS_CLIENT_SECRET:-}" ]]; then
    echo ""
    echo "Set CF_ACCESS_CLIENT_SECRET to the existing secret to continue wiring,"
    echo "or rotate by deleting the token and re-running."
    # Still ensure policy exists below using TOKEN_UUID
  else
    CLIENT_SECRET="${CF_ACCESS_CLIENT_SECRET}"
  fi
else
  CREATE_TOKEN="$(cf POST "/accounts/${ACCOUNT_ID}/access/service_tokens" \
    --data "{\"name\":\"${TOKEN_NAME}\",\"duration\":\"8760h\"}")"
  PARSE="$(node -e "
    const j=JSON.parse(process.argv[1]);
    if(!j.success){ console.error(JSON.stringify(j.errors||j,null,2)); process.exit(1) }
    const r=j.result;
    process.stdout.write([r.id,r.client_id,r.client_secret].join('\\n'));
  " "$CREATE_TOKEN")"
  TOKEN_UUID="$(echo "$PARSE" | sed -n '1p')"
  CLIENT_ID="$(echo "$PARSE" | sed -n '2p')"
  CLIENT_SECRET="$(echo "$PARSE" | sed -n '3p')"
  echo "    created token id=${TOKEN_UUID}"
  echo ""
  echo "=== SAVE THESE NOW (secret shown once) ==="
  echo "CF_ACCESS_CLIENT_ID=${CLIENT_ID}"
  echo "CF_ACCESS_CLIENT_SECRET=${CLIENT_SECRET}"
  echo "========================================="
  echo ""
fi

echo "==> Ensuring Service Auth policy ${POLICY_NAME}"
POLICIES="$(cf GET "/accounts/${ACCOUNT_ID}/access/apps/${APP_ID}/policies")"
HAS_POLICY="$(node -e "
  const j=JSON.parse(process.argv[1]);
  if(!j.success){ console.error(JSON.stringify(j.errors||j,null,2)); process.exit(1) }
  const name=process.argv[2];
  process.stdout.write((j.result||[]).some(p=>p.name===name)?'1':'0');
" "$POLICIES" "$POLICY_NAME")"

if [[ "$HAS_POLICY" != "1" ]]; then
  CREATE_POL="$(
    POLICY_NAME="$POLICY_NAME" TOKEN_UUID="$TOKEN_UUID" \
    node -e "
      console.log(JSON.stringify({
        name: process.env.POLICY_NAME,
        decision: 'non_identity',
        precedence: 2,
        include: [{ service_token: { token_id: process.env.TOKEN_UUID } }],
      }));
    " | cf POST "/accounts/${ACCOUNT_ID}/access/apps/${APP_ID}/policies" --data @-
  )"
  if ! node -e "const j=JSON.parse(process.argv[1]); if(!j.success){process.exit(1)}" "$CREATE_POL"; then
    # Fallback selector shape used by some API versions
    CREATE_POL="$(
      POLICY_NAME="$POLICY_NAME" TOKEN_UUID="$TOKEN_UUID" \
      node -e "
        console.log(JSON.stringify({
          name: process.env.POLICY_NAME,
          decision: 'non_identity',
          precedence: 2,
          include: [{ service_token: { token_uuid: process.env.TOKEN_UUID } }],
        }));
      " | cf POST "/accounts/${ACCOUNT_ID}/access/apps/${APP_ID}/policies" --data @-
    )"
  fi
  node -e "const j=JSON.parse(process.argv[1]); if(!j.success){console.error(JSON.stringify(j.errors||j,null,2)); process.exit(1)}" "$CREATE_POL"
  echo "    created policy ${POLICY_NAME}"
else
  echo "    policy already present"
fi

echo "==> Updating ${INVENTORY}"
export TOKEN_NAME POLICY_NAME TOKEN_UUID CLIENT_ID INVENTORY
node --input-type=module -e "
import fs from 'node:fs';
const path = process.env.INVENTORY;
let text = fs.readFileSync(path, 'utf8');
const stamp = new Date().toISOString().replace(/\\.\\d+Z\$/, 'Z');
if (/^Updated:/m.test(text)) {
  text = text.replace(/^Updated:.*$/m, \`Updated: \${stamp} (Access smoke token)\`);
} else {
  text = text.replace(/^(Generated:.*)$/m, \`\$1\\nUpdated: \${stamp} (Access smoke token)\`);
}
const row = \`| Access CI smoke | Service token \\\`\${process.env.TOKEN_NAME}\\\` (\${process.env.TOKEN_UUID}); policy \\\`\${process.env.POLICY_NAME}\\\`; client_id set in GitHub \\\`cloud-dev\\\` |\`;
if (/\\| Access CI smoke \\|/.test(text)) {
  text = text.replace(/\\| Access CI smoke \\|.*\\|/m, row);
} else if (/\\| Zero Trust team \\|/.test(text)) {
  text = text.replace(/(\\| Zero Trust team \\|.*\\|\\n)/, \`\$1\${row}\\n\`);
} else {
  text += \`\\n\${row}\\n\`;
}
text = text.replace(
  /- \\[ \\] Access service token for GHA smoke.*/,
  '- [x] Access service token for GHA smoke (\`' + process.env.TOKEN_NAME + '\`)',
);
if (!/- \\[x\\] Access service token for GHA smoke/.test(text) &&
    !/- \\[ \\] Access service token for GHA smoke/.test(text)) {
  text = text.replace(
    /(## Manual follow-ups\\n)/,
    '\$1- [x] Access service token for GHA smoke (\`' + process.env.TOKEN_NAME + '\`)\\n',
  );
}
fs.writeFileSync(path, text);
"

echo ""
echo "Next:"
echo "  1. export CF_ACCESS_CLIENT_ID=... CF_ACCESS_CLIENT_SECRET=..."
echo "  2. npm run ci:wire-secrets   # sets cloud-dev GitHub secrets (needs CLOUDFLARE_API_TOKEN too)"
echo "  3. SMOKE_BASE_URL=https://dev.squadme.app npm run smoke:dev"
echo "Dashboard tokens: https://one.dash.cloudflare.com/${ACCOUNT_ID}/access/service-auth/service-tokens"
