// Placeholder until `npm run cf-typegen` regenerates from wrangler.jsonc.
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket;
    JOBS: Queue;
    MATCHES: DurableObjectNamespace;
    ASSETS: Fetcher;
    ENVIRONMENT: "local" | "dev" | "production";
    APP_HOSTNAME: string;
    COMMIT_SHA?: string;
  }
}

interface Env extends Cloudflare.Env {}
