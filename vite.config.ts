import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: process.env.VITEST ? [] : [cloudflare({ configPath: "./wrangler.vite.toml" })],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
