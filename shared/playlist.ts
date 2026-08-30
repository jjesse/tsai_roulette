import type { Track } from "./types.ts";

type SpotifyArtist = { name?: string };
type SpotifyImage = { url?: string };
type SpotifyAlbum = { name?: string; images?: SpotifyImage[] };
type SpotifyItem = {
  type?: string;
  id?: string;
  uri?: string;
  name?: string;
  duration_ms?: number;
  explicit?: boolean;
  external_urls?: { spotify?: string };
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum;
};
type PlaylistRow = {
  is_local?: boolean;
  item?: SpotifyItem | null;
  track?: SpotifyItem | null;
};

export function mapPlaylistItems(rawItems: unknown[]): Track[] {
  const tracks: Track[] = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as PlaylistRow;
    if (row.is_local) continue;

    const item = row.item ?? row.track;
    if (!item || typeof item !== "object") continue;
    if (item.type && item.type !== "track") continue;
    if (!item.id || !item.name) continue;

    const artists = (item.artists ?? [])
      .map((artist) => artist.name)
      .filter((name): name is string => Boolean(name));

    const albumArt = item.album?.images?.[0]?.url ?? null;

    tracks.push({
      number: 0,
      id: item.id,
      uri: item.uri ?? `spotify:track:${item.id}`,
      name: item.name,
      artists,
      album: item.album?.name ?? "",
      albumArt,
      durationMs: item.duration_ms ?? 0,
      explicit: Boolean(item.explicit),
      url: item.external_urls?.spotify ?? `https://open.spotify.com/track/${item.id}`,
    });
  }

  return tracks.map((track, index) => ({ ...track, number: index + 1 }));
}

export function pickUnplayed<T extends { id: string }>(
  tracks: T[],
  playedIds: Iterable<string>,
  randomIndex: (length: number) => number,
): { track: T; playedIds: string[]; newRound: boolean } {
  if (tracks.length === 0) {
    throw new Error("No playable tracks in the playlist.");
  }

  const played = new Set(playedIds);
  const remaining = tracks.filter((track) => !played.has(track.id));
  const newRound = remaining.length === 0;
  const pool = newRound ? tracks : remaining;
  const track = pool[randomIndex(pool.length)];
  if (!track) {
    throw new Error("Failed to pick a track.");
  }

  const nextPlayed = newRound ? [track.id] : [...played, track.id];
  return { track, playedIds: nextPlayed, newRound };
}

export function randomIndex(length: number): number {
  if (length <= 0) throw new Error("randomIndex length must be positive");
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % length;
}
