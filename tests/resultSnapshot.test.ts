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

    expect(result).toMatchObject({
      outcome: "cleared",
      reachedDepthM: 6_000,
      remainingFuel: 56.8,
      elapsedSeconds: 240,
      score: 0,
      discoveredCount: 0,
      collectedCount: 0,
      scoreBreakdown: {
        scanScore: 0,
        firstDiscoveryBonus: 0,
        depthBonus: 0,
        fuelBonus: 0,
        finalScore: 0,
      },
      newDiscoveries: [],
      isNewBest: false,
      bestScore: 0,
      bestDepthM: 0,
      diveCount: 0,
      clearCount: 0,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.scoreBreakdown)).toBe(true);
    expect(Object.isFrozen(result.newDiscoveries)).toBe(true);
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

  it("keeps legacy stats usable while making score the final score", () => {
    const result = createDiveResultSnapshot(
      {
        depthM: 1_250,
        fuel: 12.5,
        elapsedSeconds: 50,
        status: "depleted",
      },
      {
        score: 37.9,
        discoveredCount: 2.9,
        collectedCount: 1.9,
      },
    );

    expect(result.score).toBe(37);
    expect(result.scoreBreakdown).toEqual({
      scanScore: 37,
      firstDiscoveryBonus: 0,
      depthBonus: 0,
      fuelBonus: 0,
      finalScore: 37,
    });
    expect(result.discoveredCount).toBe(2);
    expect(result.collectedCount).toBe(1);
  });

  it("normalizes expanded values and deeply freezes nested result data", () => {
    const result = createDiveResultSnapshot(
      {
        depthM: -5,
        fuel: Number.POSITIVE_INFINITY,
        elapsedSeconds: Number.NaN,
        status: "cleared",
      },
      {
        score: 999,
        scoreBreakdown: {
          scanScore: 125.9,
          firstDiscoveryBonus: 30.9,
          depthBonus: -3,
          fuelBonus: 4.9,
          finalScore: 999_999,
        },
        newDiscoveries: [
          {
            sourceCatalogId: " I001 ",
            displayName: "  Blue   Whale ",
            acceptedScientificName: " Balaenoptera   musculus ",
            category: "  mammal ",
            extra: "ignored",
          },
          null,
          {
            sourceCatalogId: "",
            displayName: "invalid",
            acceptedScientificName: "invalid",
            category: "mammal",
          },
        ],
        isNewBest: true,
        bestScore: 88.9,
        bestDepthM: -1,
        diveCount: 4.9,
        clearCount: 2.9,
        discoveredCount: 1.9,
        collectedCount: 3.9,
      },
    );

    expect(result.reachedDepthM).toBe(0);
    expect(result.remainingFuel).toBe(0);
    expect(result.elapsedSeconds).toBe(0);
    expect(result.scoreBreakdown).toEqual({
      scanScore: 125,
      firstDiscoveryBonus: 30,
      depthBonus: 0,
      fuelBonus: 4,
      finalScore: 159,
    });
    expect(result.score).toBe(159);
    expect(result.newDiscoveries).toEqual([
      {
        sourceCatalogId: "I001",
        displayName: "Blue Whale",
        acceptedScientificName: "Balaenoptera musculus",
        category: "mammal",
      },
    ]);
    expect(result.isNewBest).toBe(true);
    expect(result.bestScore).toBe(88);
    expect(result.bestDepthM).toBe(0);
    expect(result.diveCount).toBe(4);
    expect(result.clearCount).toBe(2);
    expect(Object.isFrozen(result.newDiscoveries[0])).toBe(true);
    expect(Object.isFrozen(result.scoreBreakdown)).toBe(true);
    expect(Object.isFrozen(result.newDiscoveries)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
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
