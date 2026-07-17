import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    cloudflare({
      // CLOUDFLARE_ENV selects wrangler.jsonc env.dev | env.production at build time.
      // Omit for local top-level simulation (inner loop).
    }),
  ],
});
