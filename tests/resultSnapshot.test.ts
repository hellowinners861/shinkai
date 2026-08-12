import { describe, expect, it } from "vitest";

import {
  createDiveResultSnapshot,
  type DiveResultSnapshot,
} from "../src/types/game";

describe("dive result snapshot", () => {
  it("maps a cleared terminal state to a frozen zero-score result", () => {
    const result = createDiveResultSnapshot({
      depthM: 6_000,
      fuel: 56.8,
      elapsedSeconds: 240,
      status: "cleared",
    });

    expect(result).toEqual({
      outcome: "cleared",
      reachedDepthM: 6_000,
      remainingFuel: 56.8,
      elapsedSeconds: 240,
      score: 0,
      discoveredCount: 0,
      collectedCount: 0,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("preserves depleted depth and remaining fuel without reviving the session", () => {
    const result = createDiveResultSnapshot({
      depthM: 1_250,
      fuel: 0,
      elapsedSeconds: 50,
      status: "depleted",
    });

    expect(result.outcome).toBe("depleted");
    expect(result.reachedDepthM).toBe(1_250);
    expect(result.remainingFuel).toBe(0);
    expect(result.score).toBe(0);
    expect(result.discoveredCount).toBe(0);
    expect(result.collectedCount).toBe(0);

    const readonlyResult: DiveResultSnapshot = result;
    expect(readonlyResult).toBe(result);
  });

  it("does not create a result for an active dive", () => {
    expect(() =>
      createDiveResultSnapshot({
        depthM: 100,
        fuel: 90,
        elapsedSeconds: 4,
        status: "descending",
      }),
    ).toThrow("terminal dive state");
  });
});
