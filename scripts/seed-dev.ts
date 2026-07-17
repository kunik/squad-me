/**
 * Synthetic seed for Cloud Dev / local only. Never run against production.
 *
 * Usage:
 *   npm run seed:local
 *   npm run seed:dev
 */
import { execFileSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const isLocal = args.has("--local");
const env = args.has("--env") ? "dev" : isLocal ? "local" : null;

if (!env) {
  console.error("Usage: seed-dev.ts --local | --env dev");
  process.exit(1);
}

if (env === "production" || args.has("production")) {
  console.error("Refusing to seed production.");
  process.exit(1);
}

const runId = `seed-${new Date().toISOString()}`;
const sql = `
INSERT INTO seed_runs (id, environment) VALUES ('${runId}', '${env}')
ON CONFLICT(id) DO NOTHING;
`;

const wranglerArgs = [
  "wrangler",
  "d1",
  "execute",
  "DB",
  "--command",
  sql,
  ...(isLocal ? ["--local", "--env", "dev"] : ["--remote", "--env", "dev"]),
];

console.log(`Seeding ${env} with run ${runId}`);
execFileSync("npx", wranglerArgs, { stdio: "inherit" });
console.log("Seed complete (minimal bootstrap). Expand with clubs/matches when domain schema lands.");
