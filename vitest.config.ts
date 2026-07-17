import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  plugins: [
    cloudflareTest({
      // Run Worker entry in the same isolate so bindings/DO match production shape.
      main: "./src/worker/index.ts",
      wrangler: {
        configPath: "./wrangler.jsonc",
      },
      // Remote bindings stay opt-in via wrangler.jsonc; keep tests local.
      remoteBindings: false,
    }),
  ],
});
