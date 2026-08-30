import { describe, expect, it } from "vitest";
import { appendHistory, emptySession, parseSessionState } from "../src/played.ts";

describe("session history", () => {
  const item = { number: 15, id: "a", name: "Alpha", artists: ["One"] };

  it("loads ids from old payloads that have no history", () => {
    const state = parseSessionState(JSON.stringify({ snapshotId: "snap", ids: ["a"] }), "snap");
    expect(state.ids).toEqual(["a"]);
    expect(state.history).toEqual([]);
  });

  it("resets when snapshot changes", () => {
    const state = parseSessionState(JSON.stringify({ snapshotId: "old", ids: ["a"], history: [item] }), "new");
    expect(state.ids).toEqual([]);
    expect(state.history).toEqual([]);
  });

  it("prepends unique history and ignores duplicate ids", () => {
    const first = appendHistory(emptySession("snap"), item);
    const second = appendHistory(first, { number: 22, id: "b", name: "Beta", artists: ["Two"] });
    const dup = appendHistory(second, item);
    expect(dup.history.map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});
