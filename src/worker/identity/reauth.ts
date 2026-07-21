import type { Env } from "../env";
import { randomToken, sha256Hex } from "./crypto";

/** Same TTL window as phone OTP proofs — change-phone wizard must finish in time. */
export const REAUTH_PROOF_TTL_MS = 10 * 60 * 1000;

export type ReauthPurpose = "change_phone";

const REAUTH_PURPOSES = new Set<ReauthPurpose>(["change_phone"]);

export function isReauthPurpose(value: unknown): value is ReauthPurpose {
  return typeof value === "string" && REAUTH_PURPOSES.has(value as ReauthPurpose);
}

export type IssuedReauthProof = {
  reauthProofToken: string;
  expiresAt: string;
};

/** Issues a single-use hashed proof bound to account + purpose. */
export async function issueReauthProof(
  env: Env,
  accountId: string,
  purpose: ReauthPurpose,
): Promise<IssuedReauthProof> {
  const reauthProofToken = randomToken(32);
  const proofHash = await sha256Hex(`reauth:${reauthProofToken}`);
  const expiresAt = new Date(Date.now() + REAUTH_PROOF_TTL_MS).toISOString();
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO reauth_proofs (id, account_id, purpose, proof_hash, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, accountId, purpose, proofHash, expiresAt)
    .run();

  return { reauthProofToken, expiresAt };
}

/**
 * Single-use consume. Must match account + purpose; expired or already-used
 * tokens return null (same shape as phone proof consume).
 */
export async function consumeReauthProof(
  env: Env,
  reauthProofToken: string,
  purpose: ReauthPurpose,
  accountId: string,
): Promise<boolean> {
  const proofHash = await sha256Hex(`reauth:${reauthProofToken}`);
  const proof = await env.DB.prepare(
    `SELECT id, account_id, purpose, expires_at, consumed_at FROM reauth_proofs
     WHERE proof_hash = ?`,
  )
    .bind(proofHash)
    .first<{
      id: string;
      account_id: string;
      purpose: string;
      expires_at: string;
      consumed_at: string | null;
    }>();

  if (
    !proof ||
    proof.purpose !== purpose ||
    proof.account_id !== accountId ||
    proof.consumed_at
  ) {
    return false;
  }
  if (new Date(proof.expires_at).getTime() <= Date.now()) {
    return false;
  }

  const result = await env.DB.prepare(
    `UPDATE reauth_proofs SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL`,
  )
    .bind(new Date().toISOString(), proof.id)
    .run();
  return (result.meta.changes ?? 0) === 1;
}

export async function sweepExpiredReauthProofs(env: Env): Promise<number> {
  const result = await env.DB.prepare(`DELETE FROM reauth_proofs WHERE expires_at < ?`)
    .bind(new Date().toISOString())
    .run();
  return result.meta.changes ?? 0;
}
