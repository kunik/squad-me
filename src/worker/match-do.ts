import type { Env } from "./env";

/**
 * Match-scoped Durable Object.
 * D1 remains the durable source of truth; this Object serializes match commands,
 * hosts hibernatable WebSockets, and schedules reservation alarms.
 */
export class MatchDurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const upgrade = request.headers.get("Upgrade");
      if (upgrade !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      this.state.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    if (url.pathname === "/ping") {
      return Response.json({
        ok: true,
        id: this.state.id.toString(),
        environment: this.env.ENVIRONMENT,
      });
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message === "string") {
      ws.send(message);
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ) {
    ws.close(code, wasClean ? reason : "closed");
  }

  async alarm() {
    // Reservation/payment expiry commands will re-check D1 idempotently.
  }
}
