#!/usr/bin/env bash
# Diagnose local Cloudflare auth for infra-setup scripts.
# Loads .env.cloudflare (if present), reports which token roles are set
# (booleans only), checks wrangler login, and probes DNS / Workers / Access
# APIs when the matching token (or fallback CLOUDFLARE_API_TOKEN) is configured.
#
# Exit codes:
#   0 — all configured probes passed (missing optional tokens = warn, not fail)
#   1 — a configured token failed its probe, or wrangler auth check hard-failed
#
# Never prints token values or Authorization headers.
#
# Usage:
#   npm run infra:doctor
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=lib/common.sh
source "${ROOT}/infra-setup/lib/common.sh"

# Load before defaults so CLOUDFLARE_ACCOUNT_ID / ZONE_* from .env.cloudflare apply.
load_cloudflare_env

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2758c21b02e5c7efcfa745cb49948ace}"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-c224b051f2d19f3900b68c0d69ffb3c6}"
ZONE_NAME="${CLOUDFLARE_ZONE_NAME:-squadme.app}"
API="https://api.cloudflare.com/client/v4"

FAILURES=0
WARNINGS=0

# Probe with an explicit bearer token (do not echo it). Exit 0 on CF success JSON.
cf_probe() {
  local token="$1" method="$2" path="$3"
  local body http_code
  body="$(
    curl -sS -w '\n%{http_code}' -X "${method}" "${API}${path}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      --max-time 30 \
      2>/dev/null || printf '\n000'
  )"
  http_code="$(printf '%s' "${body}" | tail -n1)"
  body="$(printf '%s' "${body}" | sed '$d')"
  node -e '
const body = process.argv[1];
const code = process.argv[2];
let j;
try { j = JSON.parse(body); } catch {
  process.exit(1);
}
if (j && j.success === true) process.exit(0);
process.exit(1);
' "${body}" "${http_code}"
}

bool_set() {
  if [[ -n "${1:-}" ]]; then echo "yes"; else echo "no"; fi
}

# Snapshot role keys before resolve_* mutates CLOUDFLARE_API_TOKEN.
GENERIC_SET=0
DNS_SET=0
ACCESS_SET=0
[[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] && GENERIC_SET=1
[[ -n "${CLOUDFLARE_API_TOKEN_DNS:-}" ]] && DNS_SET=1
[[ -n "${CLOUDFLARE_API_TOKEN_ACCESS:-}" ]] && ACCESS_SET=1

GENERIC_VAL="${CLOUDFLARE_API_TOKEN:-}"
DNS_VAL="${CLOUDFLARE_API_TOKEN_DNS:-}"
ACCESS_VAL="${CLOUDFLARE_API_TOKEN_ACCESS:-}"

echo "==> infra:doctor — local Cloudflare auth (no secrets printed)"
echo ""
echo "Token roles in env / .env.cloudflare:"
echo "  CLOUDFLARE_API_TOKEN (generic):  $(bool_set "${GENERIC_VAL}")"
echo "  CLOUDFLARE_API_TOKEN_DNS:        $(bool_set "${DNS_VAL}")"
echo "  CLOUDFLARE_API_TOKEN_ACCESS:     $(bool_set "${ACCESS_VAL}")"
echo "  CLOUDFLARE_ACCOUNT_ID override:  $(bool_set "${CLOUDFLARE_ACCOUNT_ID:-}")"
echo ""

log "Wrangler auth (OAuth / env)"
WHOAMI_OUT="$(npx wrangler whoami 2>&1 || true)"
# Strip anything that looks like a token-ish long secret; keep account summary lines.
WHOAMI_SAFE="$(
  printf '%s\n' "${WHOAMI_OUT}" | grep -viE \
    '^[A-Za-z0-9_-]{40,}$|Bearer |api[_-]?token|secret' \
    | head -n 40 || true
)"
if echo "${WHOAMI_OUT}" | grep -qiE 'not authenticated|not logged in'; then
  echo "    status: not authenticated (warn)"
  echo "    hint: npx wrangler login   # or set CLOUDFLARE_API_TOKEN in .env.cloudflare"
  WARNINGS=$((WARNINGS + 1))
elif echo "${WHOAMI_OUT}" | grep -qiE 'You are logged in|Account Name|Account ID|email'; then
  echo "    status: authenticated"
  # Prefer a short redacted summary
  if echo "${WHOAMI_SAFE}" | grep -qiE 'Account Name|Account ID|email|logged in'; then
    echo "${WHOAMI_SAFE}" | grep -iE 'Account Name|Account ID|email|logged in|Token Permissions|✓|✔' \
      | sed 's/^/    /' | head -n 12 || true
  fi
else
  echo "    status: unclear (warn) — wrangler whoami did not report a clear login state"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# DNS / Workers probes share the DNS-capable token (same as attach:production:hostname).
DNS_PROBE_TOKEN=""
DNS_PROBE_SRC=""
if [[ "${DNS_SET}" -eq 1 ]]; then
  DNS_PROBE_TOKEN="${DNS_VAL}"
  DNS_PROBE_SRC="CLOUDFLARE_API_TOKEN_DNS"
elif [[ "${GENERIC_SET}" -eq 1 ]]; then
  DNS_PROBE_TOKEN="${GENERIC_VAL}"
  DNS_PROBE_SRC="CLOUDFLARE_API_TOKEN (fallback)"
fi

log "DNS probe (zone ${ZONE_NAME} / ${ZONE_ID})"
if [[ -z "${DNS_PROBE_TOKEN}" ]]; then
  echo "    skip (warn): no CLOUDFLARE_API_TOKEN_DNS or CLOUDFLARE_API_TOKEN"
  WARNINGS=$((WARNINGS + 1))
else
  echo "    using: ${DNS_PROBE_SRC}"
  if cf_probe "${DNS_PROBE_TOKEN}" GET \
    "/zones/${ZONE_ID}/dns_records?per_page=2&name=${ZONE_NAME}"; then
    echo "    result: ok (list DNS records)"
  else
    echo "    result: FAIL (token rejected or zone read denied)"
    FAILURES=$((FAILURES + 1))
  fi
fi
echo ""

# Workers probe: domains list (attach needs this), else scripts list.
log "Workers probe (account ${ACCOUNT_ID})"
if [[ -z "${DNS_PROBE_TOKEN}" ]]; then
  echo "    skip (warn): no CLOUDFLARE_API_TOKEN_DNS or CLOUDFLARE_API_TOKEN"
  WARNINGS=$((WARNINGS + 1))
else
  echo "    using: ${DNS_PROBE_SRC}"
  if cf_probe "${DNS_PROBE_TOKEN}" GET \
    "/accounts/${ACCOUNT_ID}/workers/domains"; then
    echo "    result: ok (list Workers domains)"
  elif cf_probe "${DNS_PROBE_TOKEN}" GET \
    "/accounts/${ACCOUNT_ID}/workers/scripts"; then
    echo "    result: ok (list Workers scripts)"
  else
    echo "    result: FAIL (token rejected or Workers Scripts / domains scope missing)"
    FAILURES=$((FAILURES + 1))
  fi
fi
echo ""

# Access probe: role-specific Access token, else generic fallback.
ACCESS_PROBE_TOKEN=""
ACCESS_PROBE_SRC=""
if [[ "${ACCESS_SET}" -eq 1 ]]; then
  ACCESS_PROBE_TOKEN="${ACCESS_VAL}"
  ACCESS_PROBE_SRC="CLOUDFLARE_API_TOKEN_ACCESS"
elif [[ "${GENERIC_SET}" -eq 1 ]]; then
  ACCESS_PROBE_TOKEN="${GENERIC_VAL}"
  ACCESS_PROBE_SRC="CLOUDFLARE_API_TOKEN (fallback)"
fi

log "Access probe (account ${ACCOUNT_ID})"
if [[ -z "${ACCESS_PROBE_TOKEN}" ]]; then
  echo "    skip (warn): no CLOUDFLARE_API_TOKEN_ACCESS or CLOUDFLARE_API_TOKEN"
  WARNINGS=$((WARNINGS + 1))
else
  echo "    using: ${ACCESS_PROBE_SRC}"
  if cf_probe "${ACCESS_PROBE_TOKEN}" GET \
    "/accounts/${ACCOUNT_ID}/access/apps?per_page=2"; then
    echo "    result: ok (list Access apps)"
  elif cf_probe "${ACCESS_PROBE_TOKEN}" GET \
    "/accounts/${ACCOUNT_ID}/access/organizations"; then
    echo "    result: ok (Access organization)"
  else
    echo "    result: FAIL (token rejected or Access scopes missing)"
    FAILURES=$((FAILURES + 1))
  fi
fi
echo ""

echo "==> summary: failures=${FAILURES} warnings=${WARNINGS}"
echo "    note: missing DNS/Access tokens = warn (probe skipped);"
echo "          provision needs wrangler OAuth or CLOUDFLARE_API_TOKEN in .env.cloudflare (loaded before whoami)"
if [[ "${FAILURES}" -gt 0 ]]; then
  echo "    exit 1 — fix rejected token scopes (see docs/provision.md / .env.cloudflare.example)"
  exit 1
fi
echo "    exit 0 — configured probes passed (warnings are optional skips / login hints)"
exit 0
