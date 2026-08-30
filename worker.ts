import { loadPlaylist } from "./shared/spotify.ts";
import type { SpotifyEnv } from "./shared/types.ts";

export default {
  async fetch(request: Request, env: SpotifyEnv): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/playlist") {
      try {
        const payload = await loadPlaylist(env);
        return Response.json(payload, {
          headers: { "cache-control": "public, max-age=300" },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load playlist";
        const status = /missing environment/i.test(message)
          ? 500
          : /own the playlist|collaborator|Forbidden/i.test(message)
            ? 403
            : 502;
        return Response.json({ error: message }, { status });
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
