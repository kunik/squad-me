# Shared helpers for infra-setup/*.sh (source from repo root or after cd ROOT).
# shellcheck shell=bash

log() { echo "==> $*"; }
ok() { echo "    $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

_INFRA_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_REPO_ROOT="$(cd "${_INFRA_LIB_DIR}/../.." && pwd)"

# Load KEY=VALUE pairs from .env.cloudflare when present.
# - Never cats/echoes secret values
# - Does not override non-empty variables already in the environment
# - Safe if the file is missing (OAuth / exported env still work)
# Agents: run npm/infra scripts that call this — do NOT Read/cat .env.cloudflare.
load_cloudflare_env() {
  local env_file="${CLOUDFLARE_ENV_FILE:-${_REPO_ROOT}/.env.cloudflare}"
  if [[ ! -f "${env_file}" ]]; then
    return 0
  fi

  local line key value
  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ "${line}" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line//[[:space:]]/}" ]] && continue
    if [[ "${line}" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      if [[ "${value}" =~ ^\"(.*)\"$ ]] || [[ "${value}" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi
      # Prefer already-exported non-empty env over file
      if [[ -n "${!key:-}" ]]; then
        continue
      fi
      printf -v "${key}" '%s' "${value}"
      export "${key}"
    fi
  done < "${env_file}"

  log "Loaded ${env_file##*/} (values not shown)"
}

# Prefer a role-specific token, then CLOUDFLARE_API_TOKEN.
# Roles: dns | access | any
resolve_cloudflare_api_token() {
  local role="${1:-any}"
  local chosen=""
  case "${role}" in
    dns)
      chosen="${CLOUDFLARE_API_TOKEN_DNS:-${CLOUDFLARE_API_TOKEN:-}}"
      ;;
    access)
      chosen="${CLOUDFLARE_API_TOKEN_ACCESS:-${CLOUDFLARE_API_TOKEN:-}}"
      ;;
    *)
      chosen="${CLOUDFLARE_API_TOKEN:-}"
      ;;
  esac
  if [[ -n "${chosen}" ]]; then
    export CLOUDFLARE_API_TOKEN="${chosen}"
  fi
}

# Call once near the top of infra-setup scripts that need Dashboard API tokens.
# role: dns | access | any
use_cloudflare_api_token() {
  local role="${1:-any}"
  load_cloudflare_env
  resolve_cloudflare_api_token "${role}"
}

# Fail if Wrangler OAuth / API token is missing. Never print credential values.
# Loads .env.cloudflare first so CLOUDFLARE_API_TOKEN there satisfies wrangler
# (same as CI-style auth) for provision.sh and other OAuth-or-token scripts.
require_wrangler_auth() {
  local npm_hint="${1:-provision}"
  local whoami
  load_cloudflare_env
  whoami="$(npx wrangler whoami 2>&1 || true)"
  if echo "${whoami}" | grep -qiE 'not authenticated|not logged in'; then
    die "Not authenticated. Run: npx wrangler login
Or put CLOUDFLARE_API_TOKEN in .env.cloudflare (see .env.cloudflare.example), then: npm run ${npm_hint}"
  fi
}

require_api_token() {
  local purpose="${1:-this script}"
  local role="${2:-any}"
  use_cloudflare_api_token "${role}"
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    die "CLOUDFLARE_API_TOKEN is required for ${purpose} (Wrangler OAuth lacks these scopes).
Copy .env.cloudflare.example → .env.cloudflare and set the matching key
(CLOUDFLARE_API_TOKEN_DNS / CLOUDFLARE_API_TOKEN_ACCESS / CLOUDFLARE_API_TOKEN).
See docs/provision.md. Do not paste the token into chat.
Then re-run the npm script (scripts load .env.cloudflare automatically)."
  fi
}

# Run a wrangler create-style command that is idempotent.
# Accepts exit 0, or stderr/stdout matching already-exists patterns.
# Args: label, success_regex, command...
wrangler_ensure() {
  local label="$1"
  local ok_re="$2"
  shift 2
  local out ec=0
  set +e
  out="$("$@" 2>&1)"
  ec=$?
  set -e
  if [[ ${ec} -eq 0 ]] || echo "${out}" | grep -qiE "${ok_re}"; then
    ok "${label}"
    return 0
  fi
  if echo "${out}" | grep -qiE '10042|enable R2'; then
    echo "${out}" >&2
    die "R2 is not enabled on this account.
Open: https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID:-2758c21b02e5c7efcfa745cb49948ace}/r2/overview
Enable R2, then re-run."
  fi
  echo "${out}" >&2
  die "Failed ensuring ${label} (wrangler exit ${ec})"
}
