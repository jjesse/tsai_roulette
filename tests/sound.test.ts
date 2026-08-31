import { describe, expect, it } from "vitest";
import { canTick, MIN_TICK_GAP_MS, motionTicksAllowed, readMuted, writeMuted } from "../src/sound.ts";

describe("sound helpers", () => {
  it("treats missing storage as unmuted", () => {
    const storage = { getItem: () => null };
    expect(readMuted(storage)).toBe(false);
  });

  it("persists mute as off", () => {
    const store: Record<string, string> = {};
    writeMuted(true, { setItem: (key, value) => { store[key] = value; } });
    expect(store["tsai-roulette-sound"]).toBe("off");
    expect(readMuted({ getItem: (key) => store[key] ?? null })).toBe(true);
  });

  it("clamps ticks to the minimum gap", () => {
    expect(canTick(100, 80)).toBe(false);
    expect(canTick(100, 80, MIN_TICK_GAP_MS)).toBe(false);
    expect(canTick(110, 80)).toBe(true);
  });

  it("skips ticks when reduced motion is requested", () => {
    expect(motionTicksAllowed(() => ({ matches: true }))).toBe(false);
    expect(motionTicksAllowed(() => ({ matches: false }))).toBe(true);
  });
});
