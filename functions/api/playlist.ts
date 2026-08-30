import { loadPlaylist } from "../../shared/spotify.ts";
import type { SpotifyEnv } from "../../shared/types.ts";

type Env = SpotifyEnv;

const CACHE_TTL_SECONDS = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, waitUntil } = context;
  const playlistId = env.SPOTIFY_PLAYLIST_ID || "unknown";
  const cache = caches.default;
  const cacheKey = new Request(`https://tsai-roulette.cache/api/playlist/${playlistId}`);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const payload = await loadPlaylist(env);
    const response = new Response(JSON.stringify(payload), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    });
    waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load playlist";
    const status = /missing environment/i.test(message) ? 500 : 502;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
};
