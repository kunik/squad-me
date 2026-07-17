#!/usr/bin/env bash
# Wire GitHub Environment secrets for Squad Me CI (cloud-dev).
# Does NOT set production CLOUDFLARE_API_TOKEN (create a separate Production-scoped token).
#
# Prerequisites:
#   - gh auth login
#   - GitHub Environments cloud-dev / production already exist
#   - export CLOUDFLARE_API_TOKEN=...   # Dev deploy scopes
# Optional for Access smoke:
#   - export CF_ACCESS_CLIENT_ID=... CF_ACCESS_CLIENT_SECRET=...
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   # optional: export CF_ACCESS_CLIENT_ID=... CF_ACCESS_CLIENT_SECRET=...
#   npm run ci:wire-secrets
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-kunik/squad-me}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2758c21b02e5c7efcfa745cb49948ace}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI required" >&2
  exit 1
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is required."
  echo ""
  echo "Create a least-privilege Dev token in the Dashboard:"
  echo "  https://dash.cloudflare.com/profile/api-tokens"
  echo ""
  echo "Recommended Create Token → Edit account resources → Account Taras:"
  echo "  - Account → Workers Scripts → Edit"
  echo "  - Account → D1 → Edit"
  echo "  - Account → Workers R2 Storage → Edit"
  echo "  - Account → Queues → Edit"
  echo "  - Account → Workers Routes → Edit"
  echo "  - Account → Account Settings → Read"
  echo "Name: Squad Me Cloud Dev CI"
  echo ""
  echo "Prefill URL (permissions may need confirm in UI):"
  echo "  https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22queues%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_routes%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&name=Squad%20Me%20Cloud%20Dev%20CI&accountId=${ACCOUNT_ID}"
  echo ""
  echo "Then: export CLOUDFLARE_API_TOKEN='...' && npm run ci:wire-secrets"
  exit 1
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
  echo "==> Skipping Access smoke secrets (export CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET to set)"
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
