import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import { loadPlaylist } from "./shared/spotify.ts";
import type { SpotifyEnv } from "./shared/types.ts";

function parseDevVars(filePath: string): SpotifyEnv {
  const env: Partial<SpotifyEnv> = {};
  if (!existsSync(filePath)) return env as SpotifyEnv;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (
      key === "SPOTIFY_CLIENT_ID" ||
      key === "SPOTIFY_CLIENT_SECRET" ||
      key === "SPOTIFY_REFRESH_TOKEN" ||
      key === "SPOTIFY_PLAYLIST_ID"
    ) {
      env[key] = value;
    }
  }
  return env as SpotifyEnv;
}

function playlistDevPlugin(): Plugin {
  return {
    name: "playlist-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/playlist", async (_req, res) => {
        try {
          const env = parseDevVars(resolve(process.cwd(), ".dev.vars"));
          const payload = await loadPlaylist(env);
          res.statusCode = 200;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify(payload));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to load playlist";
          res.statusCode = 502;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [playlistDevPlugin()],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
