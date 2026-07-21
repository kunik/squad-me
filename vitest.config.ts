import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  test: {
    // scrypt (identity/password.ts) is deliberately CPU-heavy; tests that
    // register/login multiple accounts do several hashes each and can brush
    // against the 5s default under load. 20s keeps real hangs failing fast
    // while giving headroom for legitimate scrypt work.
    testTimeout: 20_000,
  },
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
