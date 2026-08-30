import { describe, expect, it } from "vitest";
import {
  normalizeAngle,
  rimLabelStep,
  shouldDrawRimLabel,
  sliceIndexAtPointer,
} from "../src/wheel.ts";

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
});

describe("rim labels", () => {
  it("uses tens for a 106-slice wheel and always includes the pointer slice", () => {
    expect(rimLabelStep(106)).toBe(10);
    expect(shouldDrawRimLabel(0, 106, 7)).toBe(true);
    expect(shouldDrawRimLabel(9, 106, 7)).toBe(true);
    expect(shouldDrawRimLabel(7, 106, 7)).toBe(true);
    expect(shouldDrawRimLabel(8, 106, 7)).toBe(false);
  });
});
