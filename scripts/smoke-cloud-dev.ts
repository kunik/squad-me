/**
 * Cloud Dev smoke against https://dev.squadme.app
 * Expand as features land. Never mutates real registrations or sends real notifications.
 *
 * Behind Cloudflare Access: set CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET
 * (Access service token) so CI/automation can pass without a browser login.
 */
const base = process.env.SMOKE_BASE_URL ?? "https://dev.squadme.app";

function accessHeaders(): HeadersInit {
  const id = process.env.CF_ACCESS_CLIENT_ID;
  const secret = process.env.CF_ACCESS_CLIENT_SECRET;
  if (!id || !secret) return {};
  return {
    "CF-Access-Client-Id": id,
    "CF-Access-Client-Secret": secret,
  };
}

async function fetchSmoke(path: string, init?: RequestInit): Promise<Response> {
  const headers = {
    ...accessHeaders(),
    ...(init?.headers ?? {}),
  };
  return fetch(`${base}${path}`, { ...init, headers });
}

async function main() {
  const health = await fetchSmoke("/api/health");
  if (health.status === 302 || health.status === 401 || health.status === 403) {
    throw new Error(
      `health blocked by Access (${health.status}). Set CF_ACCESS_CLIENT_ID and ` +
        `CF_ACCESS_CLIENT_SECRET (see npm run provision:access:smoke:dev).`,
    );
  }
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

  const db = await fetchSmoke("/api/db-smoke");
  if (!db.ok) {
    throw new Error(`db-smoke failed: ${db.status}`);
  }

  const ping = await fetchSmoke("/api/match-do-ping", {
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
