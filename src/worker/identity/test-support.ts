import type { Env } from "../env";

/**
 * Test-only schema bootstrap. `@cloudflare/vitest-pool-workers` does not
 * auto-apply `migrations/*.sql` (see `npm run migrations:local`, a separate
 * CI step) — mirrors the cumulative shape of `migrations/0002_identity.sql`
 * through `migrations/0010_disciplines_prompt_dismissal.sql` (i.e. `profiles`
 * already has `club` + nullable `first_name_ua`/`last_name_ua`/`gender`/
 * `birth_date` + `profile_completed_at`, and `accounts` already has
 * `profile_prompt_dismissed_at` + `disciplines_prompt_dismissed_at` +
 * `email_prompt_dismissed_at`, and Account /
 * Profile tombstone columns are present — this helper
 * builds the *current* schema directly rather than replaying each
 * migration's history).
 *
 * Keep in sync with migrations, especially:
 * - `profiles.account_id` is nullable (`ON DELETE SET NULL`) after 0009
 * - `phone_proofs.account_id` is nullable (set on change_phone consume)
 *
 * `assertIdentitySchemaAligned` below is a light guard against column drift.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    phone_e164 TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone_verified_at TEXT NOT NULL,
    email TEXT,
    profile_prompt_dismissed_at TEXT,
    disciplines_prompt_dismissed_at TEXT,
    email_prompt_dismissed_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email) WHERE email IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    expires_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    revoked_at TEXT,
    ip_hash TEXT,
    user_agent TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions (account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at)`,
  `CREATE TABLE IF NOT EXISTS auth_challenges (
    id TEXT PRIMARY KEY NOT NULL,
    phone_e164 TEXT NOT NULL,
    purpose TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    ip_hash TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_ref TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    expires_at TEXT NOT NULL,
    verified_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auth_challenges_phone_purpose_created
    ON auth_challenges (phone_e164, purpose, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_auth_challenges_ip_created
    ON auth_challenges (ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS phone_proofs (
    id TEXT PRIMARY KEY NOT NULL,
    phone_e164 TEXT NOT NULL,
    purpose TEXT NOT NULL,
    challenge_id TEXT NOT NULL REFERENCES auth_challenges(id),
    proof_hash TEXT NOT NULL UNIQUE,
    account_id TEXT REFERENCES accounts(id),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    expires_at TEXT NOT NULL,
    consumed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_phone_proofs_expires ON phone_proofs (expires_at)`,
  `CREATE TABLE IF NOT EXISTS auth_rate_limits (
    scope TEXT NOT NULL,
    subject TEXT NOT NULL,
    fail_count INTEGER NOT NULL DEFAULT 0,
    first_failed_at TEXT,
    locked_until TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (scope, subject)
  )`,
  `CREATE TABLE IF NOT EXISTS account_telegram_links (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT UNIQUE REFERENCES accounts(id) ON DELETE SET NULL,
    telegram_user_id TEXT NOT NULL UNIQUE,
    telegram_chat_id TEXT,
    linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_account ON push_subscriptions (account_id)`,
  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT UNIQUE REFERENCES accounts(id) ON DELETE SET NULL,
    first_name_ua TEXT,
    last_name_ua TEXT,
    first_name_en TEXT,
    last_name_en TEXT,
    nickname TEXT,
    gender TEXT CHECK (gender IS NULL OR gender IN ('male','female')),
    birth_date TEXT,
    upsf_member INTEGER NOT NULL DEFAULT 0,
    region TEXT,
    city TEXT,
    club TEXT,
    ipsc_member INTEGER NOT NULL DEFAULT 0,
    ipsc_member_number TEXT,
    ipsc_region TEXT,
    pistol_enabled INTEGER NOT NULL DEFAULT 0,
    pistol_division TEXT,
    pistol_power_factor TEXT,
    carbine_enabled INTEGER NOT NULL DEFAULT 0,
    carbine_division TEXT,
    carbine_power_factor TEXT,
    pcc_mini_rifle_enabled INTEGER NOT NULL DEFAULT 0,
    pcc_mini_rifle_division TEXT,
    pcc_mini_rifle_power_factor TEXT,
    shotgun_enabled INTEGER NOT NULL DEFAULT 0,
    shotgun_division TEXT,
    shotgun_power_factor TEXT,
    profile_completed_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  // Test-only forward-compatibility fixture for canonical Registration FKs.
  `CREATE TABLE IF NOT EXISTS account_deletion_registration_fixtures (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id),
    creator_account_id TEXT NOT NULL REFERENCES accounts(id),
    status TEXT NOT NULL,
    snapshot_name TEXT NOT NULL,
    snapshot_birth_date TEXT NOT NULL
  )`,
];

const RESET_STATEMENTS = [
  "DELETE FROM account_deletion_registration_fixtures",
  "DELETE FROM push_subscriptions",
  "DELETE FROM account_telegram_links",
  "DELETE FROM auth_rate_limits",
  "DELETE FROM phone_proofs",
  "DELETE FROM auth_challenges",
  "DELETE FROM sessions",
  "DELETE FROM profiles",
  "DELETE FROM accounts",
];

export async function applyIdentitySchema(env: Env): Promise<void> {
  for (const statement of STATEMENTS) {
    await env.DB.prepare(statement).run();
  }
  // A pool may retain a schema created by an earlier test run. CREATE TABLE IF
  // NOT EXISTS does not add new columns, so apply the additive 0009 columns.
  const accountColumns = await env.DB.prepare(`PRAGMA table_info(accounts)`).all<{
    name: string;
  }>();
  if (!accountColumns.results.some((column) => column.name === "deleted_at")) {
    await env.DB.prepare(`ALTER TABLE accounts ADD COLUMN deleted_at TEXT`).run();
  }
  const profileColumns = await env.DB.prepare(`PRAGMA table_info(profiles)`).all<{
    name: string;
  }>();
  if (!profileColumns.results.some((column) => column.name === "deleted_at")) {
    await env.DB.prepare(`ALTER TABLE profiles ADD COLUMN deleted_at TEXT`).run();
  }
  await assertIdentitySchemaAligned(env);
}

/**
 * Light CI/assert guard: required columns exist, and profiles.account_id is
 * nullable (migration 0009). Throws if the live test DB drifted from this helper.
 */
export async function assertIdentitySchemaAligned(env: Env): Promise<void> {
  const requiredAccount = [
    "id",
    "phone_e164",
    "password_hash",
    "deleted_at",
    "profile_prompt_dismissed_at",
    "disciplines_prompt_dismissed_at",
    "email_prompt_dismissed_at",
  ];
  const requiredProfile = ["id", "account_id", "nickname", "deleted_at", "profile_completed_at"];
  const requiredProof = ["id", "phone_e164", "account_id", "proof_hash", "consumed_at"];

  const accountCols = await env.DB.prepare(`PRAGMA table_info(accounts)`).all<{
    name: string;
    notnull: number;
  }>();
  const profileCols = await env.DB.prepare(`PRAGMA table_info(profiles)`).all<{
    name: string;
    notnull: number;
  }>();
  const proofCols = await env.DB.prepare(`PRAGMA table_info(phone_proofs)`).all<{
    name: string;
    notnull: number;
  }>();

  for (const name of requiredAccount) {
    if (!accountCols.results.some((c) => c.name === name)) {
      throw new Error(`test-support schema drift: accounts missing column ${name}`);
    }
  }
  for (const name of requiredProfile) {
    if (!profileCols.results.some((c) => c.name === name)) {
      throw new Error(`test-support schema drift: profiles missing column ${name}`);
    }
  }
  for (const name of requiredProof) {
    if (!proofCols.results.some((c) => c.name === name)) {
      throw new Error(`test-support schema drift: phone_proofs missing column ${name}`);
    }
  }

  const accountIdCol = profileCols.results.find((c) => c.name === "account_id");
  if (!accountIdCol || accountIdCol.notnull !== 0) {
    throw new Error(
      "test-support schema drift: profiles.account_id must be nullable (migration 0009)",
    );
  }
  const proofAccountId = proofCols.results.find((c) => c.name === "account_id");
  if (!proofAccountId || proofAccountId.notnull !== 0) {
    throw new Error("test-support schema drift: phone_proofs.account_id must be nullable");
  }
}

/** Clears all identity rows between tests without dropping the schema. */
export async function resetIdentityTables(env: Env): Promise<void> {
  for (const statement of RESET_STATEMENTS) {
    await env.DB.prepare(statement).run();
  }
}

export function testEnv(env: Env, overrides: Partial<Env> = {}): Env {
  return {
    ...env,
    SESSION_SIGNING_KEY: "test-signing-key",
    OTP_SINK_MODE: "log",
    ...overrides,
  };
}
