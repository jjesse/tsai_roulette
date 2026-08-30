export type Track = {
  number: number;
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album: string;
  albumArt: string | null;
  durationMs: number;
  explicit: boolean;
  url: string;
};

export type PlaylistPayload = {
  name: string;
  snapshotId: string;
  total: number;
  tracks: Track[];
};

export type SpotifyEnv = {
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  SPOTIFY_REFRESH_TOKEN: string;
  SPOTIFY_PLAYLIST_ID: string;
};
