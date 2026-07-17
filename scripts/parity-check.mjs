#!/usr/bin/env node
/**
 * Compare Dev/Prod Wrangler shape: logical bindings, compatibility, cron, DO tags.
 * Allowed diffs: resource IDs, domains, secret values, sampling rates.
 *
 * Usage:
 *   node scripts/parity-check.mjs           # shape only (CI PR gate)
 *   node scripts/parity-check.mjs --strict  # also require provisioned database_id
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const strict = process.argv.includes("--strict");
const raw = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
const json = raw.replace(/^\s*\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1");
const config = JSON.parse(json);

const REQUIRED_BINDINGS = ["DB", "FILES", "JOBS", "MATCHES"];
const envs = ["dev", "production"];

function fail(msg) {
  console.error(`parity: ${msg}`);
  process.exitCode = 1;
}

for (const name of envs) {
  const env = config.env?.[name];
  if (!env) {
    fail(`missing env.${name}`);
    continue;
  }

  if (!env.name || String(env.name).includes("local")) {
    fail(`env.${name} must deploy a non-local Worker name`);
  }

  const db = env.d1_databases?.find((b) => b.binding === "DB");
  if (!db?.database_name) {
    fail(`env.${name}.DB.database_name missing`);
  }
  if (
    strict &&
    (!db?.database_id || db.database_id === "PROVISION_REQUIRED")
  ) {
    fail(`env.${name}.DB.database_id is not provisioned`);
  }

  const bindings = new Set([
    ...(env.d1_databases ?? []).map((b) => b.binding),
    ...(env.r2_buckets ?? []).map((b) => b.binding),
    ...(env.queues?.producers ?? []).map((b) => b.binding),
    ...(env.durable_objects?.bindings ?? []).map((b) => b.name),
  ]);

  for (const binding of REQUIRED_BINDINGS) {
    if (!bindings.has(binding)) {
      fail(`env.${name} missing binding ${binding}`);
    }
  }

  if (!env.migrations?.length) {
    fail(`env.${name} missing Durable Object migrations`);
  }
}

const dev = config.env?.dev;
const prod = config.env?.production;
if (dev && prod) {
  const devCron = JSON.stringify(dev.triggers?.crons ?? []);
  const prodCron = JSON.stringify(prod.triggers?.crons ?? []);
  if (devCron !== prodCron) {
    fail(`cron mismatch: dev=${devCron} production=${prodCron}`);
  }

  const devDo = JSON.stringify(dev.durable_objects);
  const prodDo = JSON.stringify(prod.durable_objects);
  if (devDo !== prodDo) {
    fail("durable_objects binding shape mismatch between dev and production");
  }

  const compat = config.compatibility_date;
  const prodCompat = prod.compatibility_date ?? compat;
  const devCompat = dev.compatibility_date ?? compat;
  if (devCompat !== prodCompat) {
    fail("compatibility_date mismatch");
  }

  if (dev.limits?.cpu_ms !== prod.limits?.cpu_ms) {
    fail("limits.cpu_ms mismatch");
  }
}

if (process.exitCode) {
  console.error("parity check failed");
  process.exit(process.exitCode);
}

console.log(
  strict
    ? "parity check passed (shape + provisioned IDs)."
    : "parity check passed (shape).",
);
