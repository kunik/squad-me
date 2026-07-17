#!/usr/bin/env bash
# Wire GitHub Environment secrets for Squad Me CI (cloud-dev).
# Does NOT set production CLOUDFLARE_API_TOKEN (create a separate Production-scoped token).
#
# Prerequisites:
#   - gh auth login
#   - GitHub Environments cloud-dev / production already exist
#   - CI deploy token in .env.cloudflare as CLOUDFLARE_API_TOKEN (or export)
# Optional for Access smoke:
#   - CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET in env or .env.cloudflare
#
# Usage:
#   # put CLOUDFLARE_API_TOKEN (squad-me-ci-dev) in .env.cloudflare
#   npm run ci:wire-secrets
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=lib/common.sh
source "${ROOT}/infra-setup/lib/common.sh"

require_api_token "wiring GitHub cloud-dev secrets (CI deploy token)" any

REPO="${GITHUB_REPOSITORY:-kunik/squad-me}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2758c21b02e5c7efcfa745cb49948ace}"

if ! command -v gh >/dev/null 2>&1; then
  die "gh CLI required"
fi

echo "==> Setting cloud-dev CLOUDFLARE_ACCOUNT_ID"
printf '%s' "${ACCOUNT_ID}" | gh secret set CLOUDFLARE_ACCOUNT_ID --repo "${REPO}" --env cloud-dev

echo "==> Setting cloud-dev CLOUDFLARE_API_TOKEN"
printf '%s' "${CLOUDFLARE_API_TOKEN}" | gh secret set CLOUDFLARE_API_TOKEN --repo "${REPO}" --env cloud-dev

echo "==> Ensuring production CLOUDFLARE_ACCOUNT_ID (token left unset)"
printf '%s' "${ACCOUNT_ID}" | gh secret set CLOUDFLARE_ACCOUNT_ID --repo "${REPO}" --env production

if [[ -n "${CF_ACCESS_CLIENT_ID:-}" && -n "${CF_ACCESS_CLIENT_SECRET:-}" ]]; then
  echo "==> Setting cloud-dev Access smoke secrets"
  printf '%s' "${CF_ACCESS_CLIENT_ID}" | gh secret set CF_ACCESS_CLIENT_ID --repo "${REPO}" --env cloud-dev
  printf '%s' "${CF_ACCESS_CLIENT_SECRET}" | gh secret set CF_ACCESS_CLIENT_SECRET --repo "${REPO}" --env cloud-dev
else
  echo "==> Skipping Access smoke secrets (set CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET in .env.cloudflare or env)"
fi

echo ""
echo "cloud-dev secrets now:"
gh secret list --repo "${REPO}" --env cloud-dev
echo ""
echo "production secrets now:"
gh secret list --repo "${REPO}" --env production
echo ""
echo "Still needed for Production deploy workflow:"
echo "  Create a separate Production-scoped CLOUDFLARE_API_TOKEN and:"
echo "  printf '%s' \"\$TOKEN\" | gh secret set CLOUDFLARE_API_TOKEN --repo ${REPO} --env production"
