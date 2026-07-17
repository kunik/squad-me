#!/usr/bin/env node
/**
 * Write (or verify) D1 database_id in wrangler.jsonc for a known database_name.
 *
 * Usage:
 *   node scripts/infra-setup/lib/write-database-id.mjs <database_name> <database_id> [env]
 *   node scripts/infra-setup/lib/write-database-id.mjs --check <database_name> <database_id> [env]
 *
 * --check: exit 0 if file already has that id; exit 1 otherwise (no write).
 * No-op write when id already matches (prints "unchanged").
 */
import fs from "node:fs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const args = process.argv.slice(2);
const checkOnly = args[0] === "--check";
const positional = checkOnly ? args.slice(1) : args;
const [dbName, dbId, envName = ""] = positional;

if (!dbName || !dbId) {
  console.error(
    "Usage: write-database-id.mjs [--check] <database_name> <database_id> [env]",
  );
  process.exit(1);
}

if (!UUID_RE.test(dbId)) {
  console.error(`Invalid database_id (expected UUID): ${dbId}`);
  process.exit(1);
}

const path = "wrangler.jsonc";
const text = fs.readFileSync(path, "utf8");
const escaped = dbName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const re = new RegExp(
  `("database_name": "${escaped}",\\s*\\n\\s*"database_id": ")([^"]+)(")`,
);
const match = text.match(re);
if (!match) {
  console.error(
    `Could not locate database_id for ${dbName}${envName ? ` (env.${envName})` : ""} in ${path}`,
  );
  process.exit(1);
}

const current = match[2];
if (current === dbId) {
  if (checkOnly) {
    process.stdout.write(`ok ${dbName}=${dbId}\n`);
    process.exit(0);
  }
  process.stdout.write(`unchanged ${dbName}=${dbId}\n`);
  process.exit(0);
}

if (checkOnly) {
  console.error(`mismatch ${dbName}: file=${current} expected=${dbId}`);
  process.exit(1);
}

fs.writeFileSync(path, text.replace(re, `$1${dbId}$3`));
process.stdout.write(`updated ${dbName}: ${current} → ${dbId}\n`);
