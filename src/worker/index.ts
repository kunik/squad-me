import { MatchDurableObject } from "./match-do";
import type { Env } from "./env";
import { routeIdentityRequest } from "./identity/routes";
import { sweepExpiredOtp } from "./identity/otp";
import { sweepExpiredSessions } from "./identity/session";

export { MatchDurableObject };

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/auth/") || url.pathname === "/api/profile") {
    const identityResponse = await routeIdentityRequest(request, env, url.pathname);
    if (identityResponse) {
      return identityResponse;
    }
  }

  if (url.pathname === "/api/health") {
    return Response.json({
      ok: true,
      environment: env.ENVIRONMENT,
      commitSha: env.COMMIT_SHA ?? null,
      hostname: env.APP_HOSTNAME,
    });
  }

  if (url.pathname === "/api/match-do-ping" && request.method === "POST") {
    const body = (await request.json().catch(() => null)) as {
      matchId?: string;
    } | null;
    const matchId = body?.matchId ?? "smoke";
    const id = env.MATCHES.idFromName(`match:${matchId}`);
    const stub = env.MATCHES.get(id);
    return stub.fetch("https://do/ping");
  }

  if (url.pathname === "/api/db-smoke" && request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM schema_meta",
    ).first<{ n: number }>();
    return Response.json({ ok: true, schemaMetaRows: row?.n ?? 0 });
  }

  return new Response("Not found", { status: 404 });
}

async function handleQueue(
  batch: MessageBatch,
  _env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    // Consumers must be idempotent (at-least-once delivery).
    message.ack();
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },

  async queue(batch: MessageBatch, env: Env) {
    return handleQueue(batch, env);
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ) {
    // Outbox retry / retention / safety sweeps — idempotent handlers only.
    const [otpSweep, sessionSweep] = await Promise.all([
      sweepExpiredOtp(env),
      sweepExpiredSessions(env),
    ]);
    console.log(
      `[cron] sweep expired auth_challenges=${otpSweep.challenges} phone_proofs=${otpSweep.proofs} sessions=${sessionSweep}`,
    );
  },
};
