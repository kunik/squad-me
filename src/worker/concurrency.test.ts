import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

/**
 * Scaffold concurrency gate: N parallel conditional updates → exactly one winner.
 * Replace table/predicate with real squad_slots claim when the domain schema lands.
 */
describe("atomic claim concurrency", () => {
  it("allows exactly one winner among parallel claims", async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS claim_slots (
        id TEXT PRIMARY KEY NOT NULL,
        reserved_by TEXT,
        reserved_until TEXT
      )`,
    ).run();
    await env.DB.prepare(
      `INSERT OR REPLACE INTO claim_slots (id, reserved_by, reserved_until)
       VALUES ('slot-1', NULL, NULL)`,
    ).run();

    const now = "2026-07-17T12:00:00.000Z";
    const until = "2026-07-17T12:15:00.000Z";

    const attempts = Array.from({ length: 20 }, (_, i) =>
      env.DB.prepare(
        `UPDATE claim_slots
         SET reserved_by = ?, reserved_until = ?
         WHERE id = ?
           AND (reserved_by IS NULL OR reserved_until < ?)`,
      )
        .bind(`actor-${i}`, until, "slot-1", now)
        .run(),
    );

    const results = await Promise.all(attempts);
    const winners = results.filter(
      (r: D1Result) => (r.meta.changes ?? 0) === 1,
    );
    expect(winners).toHaveLength(1);

    const row = await env.DB.prepare(
      "SELECT reserved_by FROM claim_slots WHERE id = ?",
    )
      .bind("slot-1")
      .first<{ reserved_by: string }>();
    expect(row?.reserved_by).toMatch(/^actor-\d+$/);
  });
});
