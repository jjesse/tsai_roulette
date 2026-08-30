import { mapPlaylistItems } from "./playlist.ts";
import type { PlaylistPayload, SpotifyEnv } from "./types.ts";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
const PAGE_SIZE = 50;

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type PlaylistMeta = {
  name?: string;
  snapshot_id?: string;
  items?: { total?: number };
  tracks?: { total?: number };
  error?: { status?: number; message?: string };
};

type Paging = {
  next?: string | null;
  total?: number;
  items?: unknown[];
  error?: { status?: number; message?: string };
};

function basicAuth(clientId: string, clientSecret: string): string {
  const raw = `${clientId}:${clientSecret}`;
  if (typeof btoa === "function") return btoa(raw);
  return Buffer.from(raw, "utf8").toString("base64");
}

function requireEnv(env: SpotifyEnv): void {
  const missing = (
    [
      "SPOTIFY_CLIENT_ID",
      "SPOTIFY_CLIENT_SECRET",
      "SPOTIFY_REFRESH_TOKEN",
      "SPOTIFY_PLAYLIST_ID",
    ] as const
  ).filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

async function getAccessToken(env: SpotifyEnv): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: env.SPOTIFY_REFRESH_TOKEN,
    }),
  });

  const body = (await response.json()) as TokenResponse;
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || `Token request failed (${response.status})`);
  }
  return body.access_token;
}

async function spotifyGet<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    const message = body.error?.message || `Spotify request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function loadPlaylist(env: SpotifyEnv): Promise<PlaylistPayload> {
  requireEnv(env);
  const token = await getAccessToken(env);
  const playlistId = env.SPOTIFY_PLAYLIST_ID.trim();

  const meta = await spotifyGet<PlaylistMeta>(
    token,
    `/playlists/${encodeURIComponent(playlistId)}?fields=name,snapshot_id,items.total,tracks.total`,
  );

  const rawItems: unknown[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await spotifyGet<Paging>(
      token,
      `/playlists/${encodeURIComponent(playlistId)}/items?limit=${PAGE_SIZE}&offset=${offset}`,
    );
    const items = page.items ?? [];
    total = page.total ?? items.length;
    rawItems.push(...items);
    if (!page.next || items.length === 0) break;
    offset += PAGE_SIZE;
  }

  if (Number.isFinite(total) && rawItems.length !== total) {
    throw new Error(`Incomplete playlist fetch: got ${rawItems.length} of ${total} items`);
  }

  const tracks = mapPlaylistItems(rawItems);
  return {
    name: meta.name || "Playlist",
    snapshotId: meta.snapshot_id || "",
    total: tracks.length,
    tracks,
  };
}
