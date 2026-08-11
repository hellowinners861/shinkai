import { describe, expect, it } from "vitest";

import { vectorFromDelta } from "../src/input/vector";

describe("virtual joystick vector", () => {
  it("returns a neutral vector at rest and inside the dead zone", () => {
    expect(vectorFromDelta(0, 0, 48)).toEqual({ x: 0, y: 0, magnitude: 0 });
    expect(vectorFromDelta(2, 2, 48)).toEqual({ x: 0, y: 0, magnitude: 0 });
  });

  it("normalizes a horizontal drag and clamps beyond the travel limit", () => {
    const vector = vectorFromDelta(96, 0, 48);

    expect(vector.x).toBe(1);
    expect(vector.y).toBe(0);
    expect(vector.magnitude).toBe(1);
  });

  it("preserves direction while remapping the active range", () => {
    const vector = vectorFromDelta(-24, 24, 48);

    expect(vector.x).toBeLessThan(0);
    expect(vector.y).toBeGreaterThan(0);
    expect(vector.magnitude).toBeGreaterThan(0);
    expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(vector.magnitude);
  });
});
