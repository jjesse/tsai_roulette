import { describe, expect, it } from "vitest";
import {
  mapPlaylistItems,
  parsePlaylistId,
  pickUnplayed,
  remainingUniqueCount,
  uniqueTrackCount,
} from "../shared/playlist.ts";

describe("parsePlaylistId", () => {
  it("strips share query params and accepts URLs", () => {
    expect(parsePlaylistId("46gpuUdvKMnXSxGb5yTdAr?si=1c2123cc622e4219")).toBe("46gpuUdvKMnXSxGb5yTdAr");
    expect(
      parsePlaylistId("https://open.spotify.com/playlist/46gpuUdvKMnXSxGb5yTdAr?si=abc"),
    ).toBe("46gpuUdvKMnXSxGb5yTdAr");
    expect(parsePlaylistId("spotify:playlist:46gpuUdvKMnXSxGb5yTdAr")).toBe("46gpuUdvKMnXSxGb5yTdAr");
  });
});

describe("mapPlaylistItems", () => {
  it("numbers playable tracks in playlist order and skips unusable rows", () => {
    const tracks = mapPlaylistItems([
      {
        is_local: false,
        item: {
          type: "track",
          id: "a",
          name: "Alpha",
          duration_ms: 120000,
          explicit: false,
          artists: [{ name: "One" }],
          album: { name: "A", images: [{ url: "https://img/a" }] },
          external_urls: { spotify: "https://open.spotify.com/track/a" },
        },
      },
      { is_local: true, item: { type: "track", id: "local", name: "Local" } },
      { item: null },
      {
        track: {
          type: "track",
          id: "b",
          name: "Beta",
          duration_ms: 90000,
          explicit: true,
          artists: [{ name: "Two" }],
          album: { name: "B", images: [] },
        },
      },
    ]);

    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({ number: 1, id: "a", name: "Alpha", artists: ["One"] });
    expect(tracks[1]).toMatchObject({ number: 2, id: "b", name: "Beta", explicit: true });
  });
});

describe("pickUnplayed", () => {
  const tracks = [
    { id: "a", number: 1 },
    { id: "b", number: 2 },
    { id: "a", number: 3 },
  ];

  it("never picks a track id that was already played until the round resets", () => {
    const first = pickUnplayed(tracks, [], () => 0);
    expect(first.track.id).toBe("a");
    const second = pickUnplayed(tracks, first.playedIds, () => 0);
    expect(second.track.id).toBe("b");
    expect(second.playedIds).toEqual(["a", "b"]);
  });

  it("treats duplicate playlist slots as the same song", () => {
    const pick = pickUnplayed(tracks, [], () => 0);
    expect(pick.track.id).toBe("a");
    const second = pickUnplayed(tracks, pick.playedIds, () => 0);
    expect(second.track.id).toBe("b");
    expect(second.newRound).toBe(false);
  });

  it("starts a new round after every unique song has played", () => {
    const afterAll = pickUnplayed(tracks, ["a", "b"], () => 1);
    expect(afterAll.newRound).toBe(true);
    expect(afterAll.playedIds).toEqual([afterAll.track.id]);
  });
});

describe("unique remaining counts", () => {
  it("counts unique ids, not duplicate playlist slots", () => {
    const tracks = [
      { id: "a" },
      { id: "b" },
      { id: "a" },
    ];
    expect(uniqueTrackCount(tracks)).toBe(2);
    expect(remainingUniqueCount(tracks, [])).toBe(2);
    expect(remainingUniqueCount(tracks, ["a"])).toBe(1);
  });
});
