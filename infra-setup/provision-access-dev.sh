#!/usr/bin/env bash
# Create Cloudflare Access for Cloud Dev (dev.squadme.app).
# Wrangler OAuth does NOT include Access scopes — requires CLOUDFLARE_API_TOKEN.
#
# Prerequisites (interactive, once per account):
#   1. Zero Trust org onboarded (team name + Free plan payment details if prompted)
#      https://one.dash.cloudflare.com/
#   2. API token with Access write permissions (see docs/provision.md)
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   # optional: TEAM_AUTH_DOMAIN=squad-me ALLOW_EMAILS=you@example.com,other@example.com
#   npm run provision:access:dev
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2758c21b02e5c7efcfa745cb49948ace}"
APP_NAME="${ACCESS_APP_NAME:-squad-me-dev}"
HOSTNAME="${ACCESS_HOSTNAME:-dev.squadme.app}"
TEAM_AUTH_DOMAIN="${TEAM_AUTH_DOMAIN:-squad-me}"
TEAM_NAME="${TEAM_NAME:-Squad Me}"
ALLOW_EMAILS="${ALLOW_EMAILS:-taras.kunch@gmail.com}"
SESSION_DURATION="${ACCESS_SESSION_DURATION:-24h}"
POLICY_NAME="${ACCESS_POLICY_NAME:-Allow Dev operators}"
API="https://api.cloudflare.com/client/v4"
INVENTORY="docs/inventory-dev.md"

export ACCOUNT_ID APP_NAME HOSTNAME TEAM_AUTH_DOMAIN TEAM_NAME ALLOW_EMAILS SESSION_DURATION POLICY_NAME INVENTORY

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is required (Wrangler OAuth lacks Access scopes)."
  echo "Create a token: https://dash.cloudflare.com/profile/api-tokens"
  echo "Scopes: Access: Apps and Policies Edit; Access: Organizations, Identity Providers, and Groups Edit"
  echo "Then: export CLOUDFLARE_API_TOKEN=... && npm run provision:access:dev"
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

echo "==> Checking Zero Trust organization on account ${ACCOUNT_ID}"
ORG_JSON="$(cf GET "/accounts/${ACCOUNT_ID}/access/organizations")"
ORG_OK="$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.success?'1':'0')" "$ORG_JSON")"
if [[ "$ORG_OK" != "1" ]]; then
  echo "    No org (or no Access permission). Attempting create auth_domain=${TEAM_AUTH_DOMAIN}…"
  CREATE_ORG="$(
    TEAM_NAME="$TEAM_NAME" TEAM_AUTH_DOMAIN="$TEAM_AUTH_DOMAIN" \
    node -e "console.log(JSON.stringify({name:process.env.TEAM_NAME,auth_domain:process.env.TEAM_AUTH_DOMAIN+'.cloudflareaccess.com'}))" \
    | cf POST "/accounts/${ACCOUNT_ID}/access/organizations" --data @-
  )"
  if ! node -e "const j=JSON.parse(process.argv[1]); if(!j.success){console.error(JSON.stringify(j.errors||j,null,2)); process.exit(1)}" "$CREATE_ORG"; then
    echo ""
    echo "Blocked: Zero Trust organization must be created interactively."
    echo "  Dashboard: https://one.dash.cloudflare.com/"
    echo "  Or: https://dash.cloudflare.com/${ACCOUNT_ID}/zt-start"
    echo "  Pick a team name (suggested: ${TEAM_AUTH_DOMAIN}), complete Free plan"
    echo "  onboarding (payment details may be required even for Free), then re-run."
    exit 2
  fi
  echo "    organization created"
else
  AUTH_DOMAIN="$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.result?.auth_domain||'')" "$ORG_JSON")"
  echo "    exists (auth_domain=${AUTH_DOMAIN})"
fi

echo "==> Ensuring One-time PIN identity provider"
IDPS="$(cf GET "/accounts/${ACCOUNT_ID}/access/identity_providers")"
HAS_OTP="$(node -e "
  const j=JSON.parse(process.argv[1]);
  if(!j.success){ console.error(JSON.stringify(j.errors,null,2)); process.exit(1) }
  const hit=(j.result||[]).some(p=>p.type==='onetimepin');
  process.stdout.write(hit?'1':'0');
" "$IDPS")"
if [[ "$HAS_OTP" != "1" ]]; then
  CREATE_IDP="$(cf POST "/accounts/${ACCOUNT_ID}/access/identity_providers" --data '{"name":"One-time PIN login","type":"onetimepin","config":{}}')"
  node -e "const j=JSON.parse(process.argv[1]); if(!j.success){console.error(JSON.stringify(j.errors,null,2)); process.exit(1)}" "$CREATE_IDP"
  echo "    created One-time PIN IdP"
else
  echo "    already present"
fi

echo "==> Ensuring Access application ${APP_NAME} → ${HOSTNAME}"
APPS="$(cf GET "/accounts/${ACCOUNT_ID}/access/apps")"
APP_ID="$(node -e "
  const j=JSON.parse(process.argv[1]);
  if(!j.success){ console.error(JSON.stringify(j.errors,null,2)); process.exit(1) }
  const name=process.argv[2];
  const host=process.argv[3];
  const hit=(j.result||[]).find(a => a.name===name || a.domain===host ||
    (a.destinations||[]).some(d => d.uri===host || d.uri===host+'/'));
  process.stdout.write(hit?.id || '');
" "$APPS" "$APP_NAME" "$HOSTNAME")"

if [[ -z "$APP_ID" ]]; then
  CREATE_APP="$(
    APP_NAME="$APP_NAME" HOSTNAME="$HOSTNAME" SESSION_DURATION="$SESSION_DURATION" \
    node -e "
      const host = process.env.HOSTNAME;
      console.log(JSON.stringify({
        name: process.env.APP_NAME,
        type: 'self_hosted',
        domain: host,
        destinations: [{ type: 'public', uri: host }],
        session_duration: process.env.SESSION_DURATION,
        app_launcher_visible: false,
        auto_redirect_to_identity: false,
      }));
    " | cf POST "/accounts/${ACCOUNT_ID}/access/apps" --data @-
  )"
  APP_ID="$(node -e "
    const j=JSON.parse(process.argv[1]);
    if(!j.success){ console.error(JSON.stringify(j.errors,null,2)); process.exit(1) }
    process.stdout.write(j.result.id);
  " "$CREATE_APP")"
  echo "    created app id=${APP_ID}"
else
  echo "    already exists id=${APP_ID}"
fi

export APP_ID

echo "==> Ensuring Allow policy for: ${ALLOW_EMAILS}"
POLICIES="$(cf GET "/accounts/${ACCOUNT_ID}/access/apps/${APP_ID}/policies")"
HAS_POLICY="$(node -e "
  const j=JSON.parse(process.argv[1]);
  if(!j.success){ console.error(JSON.stringify(j.errors,null,2)); process.exit(1) }
  const name=process.argv[2];
  process.stdout.write((j.result||[]).some(p=>p.name===name)?'1':'0');
" "$POLICIES" "$POLICY_NAME")"

if [[ "$HAS_POLICY" != "1" ]]; then
  CREATE_POL="$(
    POLICY_NAME="$POLICY_NAME" ALLOW_EMAILS="$ALLOW_EMAILS" \
    node -e "
      const emails = process.env.ALLOW_EMAILS.split(',').map(s=>s.trim()).filter(Boolean);
      console.log(JSON.stringify({
        name: process.env.POLICY_NAME,
        decision: 'allow',
        precedence: 1,
        include: emails.map(email => ({ email: { email } })),
      }));
    " | cf POST "/accounts/${ACCOUNT_ID}/access/apps/${APP_ID}/policies" --data @-
  )"
  node -e "const j=JSON.parse(process.argv[1]); if(!j.success){console.error(JSON.stringify(j.errors,null,2)); process.exit(1)}" "$CREATE_POL"
  echo "    created policy ${POLICY_NAME}"
else
  echo "    policy already present (add more emails in Zero Trust → Access → Applications → ${APP_NAME})"
fi

echo "==> Updating ${INVENTORY}"
node --input-type=module -e "
import fs from 'node:fs';
const path = process.env.INVENTORY;
const appId = process.env.APP_ID;
const appName = process.env.APP_NAME;
const host = process.env.HOSTNAME;
const emails = process.env.ALLOW_EMAILS;
const policy = process.env.POLICY_NAME;
let text = fs.readFileSync(path, 'utf8');
const stamp = new Date().toISOString().replace(/\\.\\d+Z\$/, 'Z');
if (/^Updated:/m.test(text)) {
  text = text.replace(/^Updated:.*$/m, \`Updated: \${stamp} (Access)\`);
} else {
  text = text.replace(/^(Generated:.*)$/m, \`\$1\\nUpdated: \${stamp} (Access)\`);
}
const accessRow = \`| Access | App \\\`\${appName}\\\` (\${appId}); policy \\\`\${policy}\\\`; allow \${emails}; host \\\`\${host}\\\` |\`;
if (/\\| Access \\|/.test(text)) {
  text = text.replace(/\\| Access \\|.*\\|/m, accessRow);
} else {
  text = text.replace(/(\\| DO binding \\|.*\\|\\n)/, \`\$1\${accessRow}\\n\`);
}
text = text.replace(
  /- \\[ \\] Cloudflare Access application for \\\`dev\\.squadme\\.app\\\`/,
  '- [x] Cloudflare Access application for \`dev.squadme.app\`',
);
fs.writeFileSync(path, text);
"

echo ""
echo "Done. Verify:"
echo "  1. Incognito → https://${HOSTNAME}/api/health  (expect Access login, not public 200)"
echo "  2. Sign in as an allowed email (OTP or Cloudflare IdP)"
echo "  3. After session: browser works; anonymous stays blocked"
echo "Add more emails later: Zero Trust → Access → Applications → ${APP_NAME} → ${POLICY_NAME}"
echo "Dashboard: https://one.dash.cloudflare.com/${ACCOUNT_ID}/access/apps"
