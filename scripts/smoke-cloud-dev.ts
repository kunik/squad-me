/**
 * Cloud Dev smoke against https://dev.squadme.app
 * Expand as features land. Never mutates real registrations or sends real notifications.
 */
const base = process.env.SMOKE_BASE_URL ?? "https://dev.squadme.app";

async function main() {
  const health = await fetch(`${base}/api/health`);
  if (!health.ok) {
    throw new Error(`health failed: ${health.status}`);
  }
  const body = (await health.json()) as {
    ok: boolean;
    environment: string;
  };
  if (!body.ok || body.environment !== "dev") {
    throw new Error(`unexpected health payload: ${JSON.stringify(body)}`);
  }

  const db = await fetch(`${base}/api/db-smoke`);
  if (!db.ok) {
    throw new Error(`db-smoke failed: ${db.status}`);
  }

  const ping = await fetch(`${base}/api/match-do-ping`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ matchId: "smoke" }),
  });
  if (!ping.ok) {
    throw new Error(`match-do-ping failed: ${ping.status}`);
  }

  console.log("Cloud Dev smoke passed:", base);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
