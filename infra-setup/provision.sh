#!/usr/bin/env bash
# Idempotent D1/R2/Queue bootstrap for Cloud Dev or Production.
# Usage: npm run provision:dev | npm run provision:production
#    or: bash infra-setup/provision.sh <dev|production>
#
# Owner/local only — never from PR CI. Access and apex DNS attach stay separate
# (different credentials / APIs).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_NAME="${1:-}"
case "${ENV_NAME}" in
  dev|production) ;;
  *)
    echo "Usage: bash infra-setup/provision.sh <dev|production>"
    echo "  npm run provision:dev"
    echo "  npm run provision:production"
    exit 1
    ;;
esac

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2758c21b02e5c7efcfa745cb49948ace}"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-c224b051f2d19f3900b68c0d69ffb3c6}"
DB_NAME="squad-me-${ENV_NAME}-db"
BUCKET="squad-me-${ENV_NAME}-files"
QUEUE="squad-me-${ENV_NAME}-jobs"
DLQ="squad-me-${ENV_NAME}-jobs-dlq"
WORKER="squad-me-${ENV_NAME}-app"
INVENTORY="docs/inventory-${ENV_NAME}.md"
NPM_SCRIPT="provision:${ENV_NAME}"

if [[ "${ENV_NAME}" == "dev" ]]; then
  HOSTNAME="dev.squadme.app"
else
  HOSTNAME="squadme.app"
fi

WHOAMI="$(npx wrangler whoami 2>&1 || true)"
if echo "${WHOAMI}" | grep -qiE 'not authenticated|not logged in|CLOUDFLARE_API_TOKEN'; then
  echo "Not authenticated. Run: npx wrangler login"
  echo "Or export CLOUDFLARE_API_TOKEN, then: npm run ${NPM_SCRIPT}"
  exit 1
fi

echo "==> Ensuring D1 database ${DB_NAME}"
if ! npx wrangler d1 list | grep -q "${DB_NAME}"; then
  npx wrangler d1 create "${DB_NAME}"
else
  echo "    already exists"
fi

DB_ID="$(
  npx wrangler d1 list --json \
    | node -e "
      const rows=JSON.parse(require('fs').readFileSync(0,'utf8'));
      const hit=rows.find(r=>r.name===process.argv[1]);
      if(!hit){console.error('D1 '+process.argv[1]+' not found'); process.exit(1)}
      process.stdout.write(hit.uuid);
    " "${DB_NAME}"
)"

echo "==> Writing database_id=${DB_ID} into wrangler.jsonc env.${ENV_NAME}"
node infra-setup/lib/write-database-id.mjs "${DB_NAME}" "${DB_ID}" "${ENV_NAME}"

echo "==> Ensuring R2 bucket ${BUCKET}"
R2_OUT="$(npx wrangler r2 bucket create "${BUCKET}" 2>&1)" || true
if echo "${R2_OUT}" | grep -qiE 'Created bucket|already exists'; then
  echo "    ok"
elif echo "${R2_OUT}" | grep -qiE '10042|enable R2'; then
  echo "${R2_OUT}"
  echo ""
  echo "R2 is not enabled on this account."
  echo "Open: https://dash.cloudflare.com/${ACCOUNT_ID}/r2/overview"
  echo "Enable/purchase R2, then re-run: npm run ${NPM_SCRIPT}"
  exit 1
else
  echo "${R2_OUT}"
  if echo "${R2_OUT}" | grep -qiE 'error|✘'; then
    exit 1
  fi
  echo "    ok (create returned non-standard success text)"
fi

echo "==> Ensuring queues ${QUEUE} and ${DLQ}"
for Q in "${DLQ}" "${QUEUE}"; do
  Q_OUT="$(npx wrangler queues create "${Q}" 2>&1)" || true
  if echo "${Q_OUT}" | grep -qiE 'Created queue|already exists|already taken'; then
    echo "    ${Q}: ok"
  elif echo "${Q_OUT}" | grep -qiE 'error|✘'; then
    echo "${Q_OUT}"
    exit 1
  else
    echo "    ${Q}: ok"
  fi
done

echo "==> Applying D1 migrations (remote, env=${ENV_NAME})"
npx wrangler d1 migrations apply DB --remote --env "${ENV_NAME}"

echo "==> Writing ${INVENTORY}"
# Preserve Access row and checked follow-ups across re-runs.
PREV_ACCESS=""
PREV_CHECKS=""
if [[ -f "${INVENTORY}" ]]; then
  PREV_ACCESS="$(grep -E '^\| Access \|' "${INVENTORY}" || true)"
  PREV_CHECKS="$(grep -E '^- \[x\]' "${INVENTORY}" || true)"
fi

if [[ -z "${PREV_ACCESS}" ]]; then
  if [[ "${ENV_NAME}" == "dev" ]]; then
    PREV_ACCESS="| Access | Configure with \`npm run provision:access:dev\` (Access-capable API token) |"
  else
    PREV_ACCESS="| Access | None for Production stub (public). Dev Access unchanged. |"
  fi
fi

STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [[ "${ENV_NAME}" == "dev" ]]; then
  TITLE="Cloud Dev inventory"
else
  TITLE="Production inventory"
fi

has_check() { grep -qF "$1" <<<"${PREV_CHECKS}"; }

FOLLOW_UPS=""
if [[ "${ENV_NAME}" == "dev" ]]; then
  if has_check "Attach custom domain \`dev.squadme.app\`"; then
    FOLLOW_UPS+="- [x] Attach custom domain \`dev.squadme.app\` (deploy created DNS + cert)"$'\n'
  else
    FOLLOW_UPS+="- [ ] Attach custom domain \`dev.squadme.app\` (via \`npm run deploy:dev\`)"$'\n'
  fi
  if has_check "Cloudflare Access application"; then
    FOLLOW_UPS+="- [x] Cloudflare Access application for \`dev.squadme.app\`"$'\n'
  else
    FOLLOW_UPS+="- [ ] Cloudflare Access application for \`dev.squadme.app\` (\`npm run provision:access:dev\`)"$'\n'
  fi
  FOLLOW_UPS+="- [ ] \`wrangler secret put\` for Dev identity/session/notification test keys (\`--env dev\`)"$'\n'
  FOLLOW_UPS+="- [ ] GitHub Environment \`cloud-dev\` secrets: \`CLOUDFLARE_API_TOKEN\` (Dev-scoped)"$'\n'
  if has_check "First deploy"; then
    FOLLOW_UPS+="- [x] First deploy: \`npm run deploy:dev\` (smoke OK)"$'\n'
  else
    FOLLOW_UPS+="- [ ] First deploy: \`npm run deploy:dev\` then \`npm run smoke:dev\`"$'\n'
  fi
else
  if has_check "Attach custom domain \`squadme.app\`"; then
    FOLLOW_UPS+="- [x] Attach custom domain \`squadme.app\`"$'\n'
  else
    FOLLOW_UPS+="- [ ] Attach custom domain \`squadme.app\` — if API \`100117\`, \`npm run attach:production:hostname\` or Dashboard DNS delete A/AAAA/CNAME then \`npm run deploy:production\`"$'\n'
  fi
  FOLLOW_UPS+="- [ ] Verify stub + health: \`https://squadme.app\` and \`/api/health\` → \`environment=production\`"$'\n'
  FOLLOW_UPS+="- [ ] \`wrangler secret put\` for Production identity/session/notification keys (\`--env production\`)"$'\n'
  FOLLOW_UPS+="- [ ] GitHub Environment \`production\` secrets + required reviewers (not created yet)"$'\n'
fi

cat > "${INVENTORY}" <<EOF
# ${TITLE}

Generated: ${STAMP}

| Resource | Name / value |
|---|---|
| Worker | \`${WORKER}\` |
| Hostname | \`${HOSTNAME}\` |
| Zone | \`squadme.app\` (\`${ZONE_ID}\`) |
| Account | Taras (\`${ACCOUNT_ID}\`) |
| D1 | \`${DB_NAME}\` (\`${DB_ID}\`) |
| R2 | \`${BUCKET}\` |
| Queue | \`${QUEUE}\` |
| DLQ | \`${DLQ}\` |
| DO binding | \`MATCHES\` → \`MatchDurableObject\` |
${PREV_ACCESS}
| Free plan | No \`limits.cpu_ms\` (parity; re-add when Workers Paid) |

## Manual follow-ups

${FOLLOW_UPS}
EOF

echo "Done. Review ${INVENTORY}."
if [[ "${ENV_NAME}" == "dev" ]]; then
  echo "Next: npm run deploy:dev && npm run smoke:dev"
  echo "Access: npm run provision:access:dev (Access-capable API token)"
else
  echo "Next: npm run deploy:production"
  echo "If apex attach fails (100117): npm run attach:production:hostname"
fi
