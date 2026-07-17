#!/usr/bin/env bash
# Idempotent D1/R2/Queue bootstrap for Cloud Dev or Production.
# Usage: npm run provision:dev | npm run provision:production
#    or: bash infra-setup/provision.sh <dev|production>
#
# Owner/local only — never from PR CI. Access and apex DNS attach stay separate
# (different credentials / APIs). Safe to re-run; does not wipe Access/GitHub
# inventory notes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=lib/common.sh
source "${ROOT}/infra-setup/lib/common.sh"

ENV_NAME="${1:-}"
case "${ENV_NAME}" in
  dev|production) ;;
  *)
    die "Usage: bash infra-setup/provision.sh <dev|production>
  npm run provision:dev
  npm run provision:production"
    ;;
esac

# Non-interactive: skip wrangler migration confirm when TTY is absent / CI.
export CI="${CI:-1}"

CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2758c21b02e5c7efcfa745cb49948ace}"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-c224b051f2d19f3900b68c0d69ffb3c6}"
export CLOUDFLARE_ACCOUNT_ID

DB_NAME="squad-me-${ENV_NAME}-db"
BUCKET="squad-me-${ENV_NAME}-files"
QUEUE="squad-me-${ENV_NAME}-jobs"
DLQ="squad-me-${ENV_NAME}-jobs-dlq"
WORKER="squad-me-${ENV_NAME}-app"
NPM_SCRIPT="provision:${ENV_NAME}"

if [[ "${ENV_NAME}" == "dev" ]]; then
  HOSTNAME="dev.squadme.app"
else
  HOSTNAME="squadme.app"
fi

require_wrangler_auth "${NPM_SCRIPT}"

log "Ensuring D1 database ${DB_NAME}"
# Prefer JSON existence check (avoid substring false-positives on text list).
DB_ID="$(
  npx wrangler d1 list --json \
    | node -e "
      let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
        let rows;
        try { rows = JSON.parse(d); } catch (e) {
          console.error('Failed to parse wrangler d1 list --json'); process.exit(1);
        }
        if (!Array.isArray(rows)) { console.error('Unexpected d1 list JSON shape'); process.exit(1); }
        const hit = rows.find(r => r.name === process.argv[1]);
        process.stdout.write(hit ? hit.uuid : '');
      });
    " "${DB_NAME}"
)"
if [[ -z "${DB_ID}" ]]; then
  npx wrangler d1 create "${DB_NAME}"
  DB_ID="$(
    npx wrangler d1 list --json \
      | node -e "
        let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
          const rows = JSON.parse(d);
          const hit = rows.find(r => r.name === process.argv[1]);
          if (!hit) { console.error('D1 '+process.argv[1]+' missing after create'); process.exit(1); }
          process.stdout.write(hit.uuid);
        });
      " "${DB_NAME}"
  )"
  ok "created ${DB_NAME} (${DB_ID})"
else
  ok "already exists (${DB_ID})"
fi

log "Writing database_id into wrangler.jsonc env.${ENV_NAME}"
node infra-setup/lib/write-database-id.mjs "${DB_NAME}" "${DB_ID}" "${ENV_NAME}"

log "Ensuring R2 bucket ${BUCKET}"
wrangler_ensure "R2 ${BUCKET}" 'Created bucket|already exists' \
  npx wrangler r2 bucket create "${BUCKET}"

log "Ensuring queues ${QUEUE} and ${DLQ}"
# DLQ first so the main queue can reference it if needed later.
wrangler_ensure "queue ${DLQ}" 'Created queue|already exists|already taken' \
  npx wrangler queues create "${DLQ}"
wrangler_ensure "queue ${QUEUE}" 'Created queue|already exists|already taken' \
  npx wrangler queues create "${QUEUE}"

log "Applying D1 migrations (remote, env=${ENV_NAME})"
npx wrangler d1 migrations apply DB --remote --env "${ENV_NAME}"

log "Updating inventory resource rows (preserves Access/GitHub notes)"
node infra-setup/lib/update-inventory-resources.mjs "${ENV_NAME}" \
  --worker "${WORKER}" \
  --hostname "${HOSTNAME}" \
  --zone-id "${ZONE_ID}" \
  --account-id "${CLOUDFLARE_ACCOUNT_ID}" \
  --db-name "${DB_NAME}" \
  --db-id "${DB_ID}" \
  --bucket "${BUCKET}" \
  --queue "${QUEUE}" \
  --dlq "${DLQ}"

log "Verifying wrangler.jsonc database_id"
node infra-setup/lib/write-database-id.mjs --check "${DB_NAME}" "${DB_ID}" "${ENV_NAME}"

echo "Done (${ENV_NAME})."
if [[ "${ENV_NAME}" == "dev" ]]; then
  echo "Next: npm run deploy:dev && npm run smoke:dev"
  echo "Access: npm run provision:access:dev (Access-capable API token)"
else
  echo "Next: npm run deploy:production"
  echo "If apex attach fails (100117): npm run attach:production:hostname"
fi
