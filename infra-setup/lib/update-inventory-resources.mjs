#!/usr/bin/env node
/**
 * Update resource rows in docs/inventory-{dev,production}.md without wiping
 * Access / GitHub / human follow-up state. Creates a minimal file if missing.
 *
 * Usage:
 *   node infra-setup/lib/update-inventory-resources.mjs <env> \
 *     --worker W --hostname H --zone-id Z --account-id A \
 *     --db-name N --db-id ID --bucket B --queue Q --dlq D
 */
import fs from "node:fs";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || !process.argv[i + 1]) {
    console.error(`Missing ${flag}`);
    process.exit(1);
  }
  return process.argv[i + 1];
}

const env = process.argv[2];
if (env !== "dev" && env !== "production") {
  console.error("Usage: update-inventory-resources.mjs <dev|production> --worker ...");
  process.exit(1);
}

const worker = arg("--worker");
const hostname = arg("--hostname");
const zoneId = arg("--zone-id");
const accountId = arg("--account-id");
const dbName = arg("--db-name");
const dbId = arg("--db-id");
const bucket = arg("--bucket");
const queue = arg("--queue");
const dlq = arg("--dlq");

const path = `docs/inventory-${env}.md`;
const stamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");
const title = env === "dev" ? "Cloud Dev inventory" : "Production inventory";

const resourceRows = {
  Worker: `\`${worker}\``,
  Hostname: `\`${hostname}\``,
  Zone: `\`squadme.app\` (\`${zoneId}\`)`,
  Account: `Taras (\`${accountId}\`)`,
  D1: `\`${dbName}\` (\`${dbId}\`)`,
  R2: `\`${bucket}\``,
  Queue: `\`${queue}\``,
  DLQ: `\`${dlq}\``,
  "DO binding": "`MATCHES` → `MatchDurableObject`",
};

function upsertRow(text, key, value) {
  const line = `| ${key} | ${value} |`;
  const re = new RegExp(`^\\| ${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|(.*)\\|$`, "m");
  const m = text.match(re);
  if (m) {
    const prev = m[1].trim();
    // Keep richer human annotations (e.g. Hostname "… (attached)") when they already
    // contain the machine value we would write.
    const bare = value.replace(/^`|`$/g, "");
    if (prev.includes(bare) && prev.length > value.length) return text;
    return text.replace(re, line);
  }
  if (/^\| DO binding \|/m.test(text)) {
    return text.replace(/^(\| DO binding \|.*\|)$/m, `${line}\n$1`);
  }
  return text;
}

function bootstrapTemplate() {
  const access =
    env === "dev"
      ? "| Access | Configure with `npm run provision:access:dev` |"
      : "| Access | None for Production stub (public). |";
  const follow =
    env === "dev"
      ? [
          "- [ ] Attach custom domain `dev.squadme.app` (via `npm run deploy:dev`)",
          "- [ ] Cloudflare Access (`npm run provision:access:dev`)",
          "- [ ] `wrangler secret put` for Dev test keys (`--env dev`)",
          "- [ ] GitHub `cloud-dev` secrets via `npm run ci:wire-secrets`",
          "- [ ] First deploy + `npm run smoke:dev`",
        ].join("\n")
      : [
          "- [ ] Attach custom domain `squadme.app` (`npm run attach:production:hostname` if API 100117)",
          "- [ ] Verify stub + `/api/health` → `environment=production`",
          "- [ ] `wrangler secret put` for Production keys (`--env production`)",
          "- [ ] GitHub `production` secret `CLOUDFLARE_API_TOKEN` (Production-scoped)",
        ].join("\n");

  return `# ${title}

Generated: ${stamp}

| Resource | Name / value |
|---|---|
| Worker | ${resourceRows.Worker} |
| Hostname | ${resourceRows.Hostname} |
| Zone | ${resourceRows.Zone} |
| Account | ${resourceRows.Account} |
| D1 | ${resourceRows.D1} |
| R2 | ${resourceRows.R2} |
| Queue | ${resourceRows.Queue} |
| DLQ | ${resourceRows.DLQ} |
| DO binding | ${resourceRows["DO binding"]} |
${access}
| Free plan | No \`limits.cpu_ms\` (parity; re-add when Workers Paid) |

## Manual follow-ups

${follow}
`;
}

let text;
let created = false;
try {
  text = fs.readFileSync(path, "utf8");
} catch {
  text = bootstrapTemplate();
  created = true;
}

if (!created) {
  if (/^Generated:/m.test(text)) {
    text = text.replace(/^Generated:.*$/m, `Generated: ${stamp}`);
  } else {
    text = text.replace(/^(# .+)\n/, `$1\n\nGenerated: ${stamp}\n`);
  }
  if (/^Updated:/m.test(text)) {
    text = text.replace(/^Updated:.*$/m, `Updated: ${stamp} (provision resources)`);
  } else {
    text = text.replace(/^(Generated:.*)$/m, `$1\nUpdated: ${stamp} (provision resources)`);
  }
  for (const [key, value] of Object.entries(resourceRows)) {
    text = upsertRow(text, key, value);
  }
}

fs.writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`);
process.stdout.write(`${created ? "created" : "updated"} ${path}\n`);
