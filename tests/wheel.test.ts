import { describe, expect, it } from "vitest";
import { normalizeAngle, sliceIndexAtPointer, spinTargetAngle } from "../src/wheel.ts";

describe("sliceIndexAtPointer", () => {
  it("starts on slice 0", () => {
    expect(sliceIndexAtPointer(0, 106)).toBe(0);
  });

  it("matches the landing angle used to stop on an index", () => {
    const n = 106;
    const slice = (Math.PI * 2) / n;
    for (const index of [0, 1, 17, 50, 105]) {
      const landing = normalizeAngle((n - index) * slice - slice / 2);
      expect(sliceIndexAtPointer(landing, n)).toBe(index);
    }
  });

  it("whole extra turns land on the chosen index even if extraTurns is fractional", () => {
    const n = 106;
    for (const index of [14, 70, 105]) {
      const target = spinTargetAngle(12.3, index, n, 5.7);
      expect(sliceIndexAtPointer(target, n)).toBe(index);
    }
  });

  it("hub number and pick share the pointer index (not a nearby rim number)", () => {
    const n = 106;
    const pickIndex = 70;
    const target = spinTargetAngle(0, pickIndex, n, 5);
    expect(sliceIndexAtPointer(target, n)).toBe(70);
    expect(sliceIndexAtPointer(target, n) + 1).toBe(71);
  });
});
