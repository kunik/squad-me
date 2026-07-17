export type Env = {
  DB: D1Database;
  FILES: R2Bucket;
  JOBS: Queue;
  MATCHES: DurableObjectNamespace;
  ASSETS: Fetcher;
  ENVIRONMENT: "local" | "dev" | "production";
  APP_HOSTNAME: string;
  COMMIT_SHA?: string;
};
