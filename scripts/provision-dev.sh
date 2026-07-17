#!/usr/bin/env bash
# Idempotent Cloud Dev bootstrap for Squad Me.
# Requires: wrangler login (or CLOUDFLARE_API_TOKEN with Dev-scoped permissions).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_NAME="dev"
DB_NAME="squad-me-dev-db"
BUCKET="squad-me-dev-files"
QUEUE="squad-me-dev-jobs"
DLQ="squad-me-dev-jobs-dlq"
INVENTORY="docs/inventory-dev.md"

WHOAMI="$(npx wrangler whoami 2>&1 || true)"
if echo "${WHOAMI}" | grep -qiE 'not authenticated|not logged in|CLOUDFLARE_API_TOKEN'; then
  echo "Not authenticated. Run: npx wrangler login"
  echo "Or export a Dev-scoped CLOUDFLARE_API_TOKEN, then: npm run provision:dev"
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
      const chunks=[];
      process.stdin.on('data',d=>chunks.push(d));
      process.stdin.on('end',()=>{
        const rows=JSON.parse(Buffer.concat(chunks).toString());
        const hit=rows.find(r=>r.name==='${DB_NAME}');
        if(!hit){console.error('D1 ${DB_NAME} not found after create'); process.exit(1)}
        process.stdout.write(hit.uuid);
      });
    "
)"

echo "==> Writing database_id=${DB_ID} into wrangler.jsonc env.${ENV_NAME}"
node --input-type=module -e "
import fs from 'node:fs';
const path='wrangler.jsonc';
let text=fs.readFileSync(path,'utf8');
const marker='\"database_name\": \"squad-me-dev-db\"';
const re=/(\"database_name\": \"squad-me-dev-db\",\\s*\\n\\s*\"database_id\": \")[^\"]+(\")/;
if(!re.test(text)){
  console.error('Could not locate env.dev database_id in wrangler.jsonc');
  process.exit(1);
}
text=text.replace(re, '\$1${DB_ID}\$2');
fs.writeFileSync(path,text);
"

echo "==> Ensuring R2 bucket ${BUCKET}"
R2_OUT="$(npx wrangler r2 bucket create "${BUCKET}" 2>&1)" || true
if echo "${R2_OUT}" | grep -qiE 'Created bucket|already exists'; then
  echo "    ok"
elif echo "${R2_OUT}" | grep -qiE '10042|enable R2'; then
  echo "${R2_OUT}"
  echo ""
  echo "R2 is not enabled on this account."
  echo "Open: https://dash.cloudflare.com/2758c21b02e5c7efcfa745cb49948ace/r2/overview"
  echo "Enable/purchase R2, then re-run: npm run provision:dev"
  exit 1
else
  echo "${R2_OUT}"
  # Treat other failures as hard errors (do not silently continue).
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

cat > "${INVENTORY}" <<EOF
# Cloud Dev inventory

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

| Resource | Name / value |
|---|---|
| Worker | \`squad-me-dev-app\` |
| Hostname | \`dev.squadme.app\` |
| D1 | \`${DB_NAME}\` (\`${DB_ID}\`) |
| R2 | \`${BUCKET}\` |
| Queue | \`${QUEUE}\` |
| DLQ | \`${DLQ}\` |
| DO binding | \`MATCHES\` → \`MatchDurableObject\` |
| Access | Cloudflare Access required (configure in Zero Trust) |

## Manual follow-ups

- [ ] Attach custom domain \`dev.squadme.app\` (zone DNS + Worker route already declared in wrangler)
- [ ] Cloudflare Access application for \`dev.squadme.app\`
- [ ] \`wrangler secret put\` for Dev identity/session/notification test keys (\`--env dev\`)
- [ ] GitHub Environment \`cloud-dev\` secrets: \`CLOUDFLARE_API_TOKEN\` (Dev-scoped)
- [ ] First deploy: \`npm run deploy:dev\` then \`npm run smoke:dev\`
EOF

echo "==> Inventory written to ${INVENTORY}"
echo "Done. Review ${INVENTORY} and complete Access/secrets manually."
