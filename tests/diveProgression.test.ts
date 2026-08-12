import { describe, expect, it } from "vitest";

import {
  advanceDiveProgression,
  clampDiveFrameSeconds,
  createInitialDiveProgressionState,
  DIVE_TARGET_DEPTH_M,
  MAX_DIVE_FRAME_SECONDS,
} from "../src/game/diveProgression";

describe("dive progression", () => {
  it("creates the documented starting state", () => {
    expect(createInitialDiveProgressionState()).toEqual({
      depthM: 0,
      fuel: 100,
      elapsedSeconds: 0,
      status: "descending",
    });
  });

  it("advances depth and normal fuel consumption", () => {
    const next = advanceDiveProgression(
      createInitialDiveProgressionState(),
      1,
    );

    expect(next.depthM).toBe(25);
    expect(next.fuel).toBeCloseTo(99.82, 10);
    expect(next.elapsedSeconds).toBe(1);
    expect(next.status).toBe("descending");
  });

  it("clears at the target depth while retaining normal fuel", () => {
    const next = advanceDiveProgression(
      createInitialDiveProgressionState(),
      240,
    );

    expect(next.depthM).toBe(DIVE_TARGET_DEPTH_M);
    expect(next.fuel).toBeCloseTo(56.8, 10);
    expect(next.elapsedSeconds).toBe(240);
    expect(next.status).toBe("cleared");
  });

  it("caps a single frame and ignores invalid frame durations", () => {
    expect(clampDiveFrameSeconds(MAX_DIVE_FRAME_SECONDS)).toBe(
      MAX_DIVE_FRAME_SECONDS,
    );
    expect(clampDiveFrameSeconds(1)).toBe(MAX_DIVE_FRAME_SECONDS);
    expect(clampDiveFrameSeconds(0)).toBe(0);
    expect(clampDiveFrameSeconds(-1)).toBe(0);
    expect(clampDiveFrameSeconds(Number.NaN)).toBe(0);
    expect(clampDiveFrameSeconds(Number.POSITIVE_INFINITY)).toBe(0);

    const initial = createInitialDiveProgressionState();
    expect(advanceDiveProgression(initial, Number.NaN)).toBe(initial);
    expect(advanceDiveProgression(initial, Number.NEGATIVE_INFINITY)).toBe(initial);
    expect(advanceDiveProgression(initial, -1)).toBe(initial);
  });

  it("clamps progression values and prioritizes depletion", () => {
    const depleted = advanceDiveProgression(
      {
        depthM: DIVE_TARGET_DEPTH_M - 1,
        fuel: 0.01,
        elapsedSeconds: 10,
        status: "descending",
      },
      1,
    );

    expect(depleted.depthM).toBe(DIVE_TARGET_DEPTH_M);
    expect(depleted.fuel).toBe(0);
    expect(depleted.status).toBe("depleted");
  });

  it("does not change a terminal state", () => {
    const cleared = {
      depthM: DIVE_TARGET_DEPTH_M,
      fuel: 56.8,
      elapsedSeconds: 240,
      status: "cleared" as const,
    };
    const depleted = {
      depthM: 100,
      fuel: 0,
      elapsedSeconds: 10,
      status: "depleted" as const,
    };

    expect(advanceDiveProgression(cleared, 1)).toBe(cleared);
    expect(advanceDiveProgression(depleted, 1)).toBe(depleted);
  });
});
