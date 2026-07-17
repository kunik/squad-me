#!/usr/bin/env node
/** Write D1 database_id into wrangler.jsonc for a known database_name. */
import fs from "node:fs";

const [dbName, dbId, envName = ""] = process.argv.slice(2);
if (!dbName || !dbId) {
  console.error("Usage: write-database-id.mjs <database_name> <database_id> [env]");
  process.exit(1);
}

const path = "wrangler.jsonc";
const text = fs.readFileSync(path, "utf8");
const re = new RegExp(
  `("database_name": "${dbName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}",\\s*\\n\\s*"database_id": ")[^"]+(")`,
);
if (!re.test(text)) {
  console.error(
    `Could not locate database_id for ${dbName}${envName ? ` (env.${envName})` : ""} in wrangler.jsonc`,
  );
  process.exit(1);
}
fs.writeFileSync(path, text.replace(re, `$1${dbId}$2`));
