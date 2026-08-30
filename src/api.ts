import type { PlaylistPayload } from "../shared/types.ts";

export async function fetchPlaylist(): Promise<PlaylistPayload> {
  const response = await fetch("/api/playlist");
  const body = (await response.json()) as PlaylistPayload & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Playlist request failed (${response.status})`);
  }
  if (!body.tracks || !Array.isArray(body.tracks)) {
    throw new Error("Playlist response was missing tracks");
  }
  return body;
}
