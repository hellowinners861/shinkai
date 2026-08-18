import { describe, expect, it } from "vitest";

import {
  BASE_SCORE_VALUES,
  calculateDepthBonus,
  calculateFinalScore,
  calculateFirstDiscoveryBonus,
  calculateFuelBonus,
  calculateScanScore,
  calculateScoreBreakdown,
  completeScan,
  createInitialScoreState,
  getScoreMultiplier,
  resetCleanStreak,
} from "../src/game/scoreRules";

describe("score rules", () => {
  it("uses the five documented base scores and an unmultiplied discovery bonus", () => {
    expect(BASE_SCORE_VALUES).toEqual([10, 25, 50, 75, 100]);
    for (const baseScore of BASE_SCORE_VALUES) {
      expect(calculateFirstDiscoveryBonus(baseScore)).toBe(baseScore);
    }
    expect(calculateFirstDiscoveryBonus(-10)).toBe(0);
    expect(calculateFirstDiscoveryBonus(Number.NaN)).toBe(0);
  });

  it("ramps the clean streak in 0.25 steps and caps at 2x", () => {
    expect([0, 1, 2, 3, 4, 5, 8].map(getScoreMultiplier)).toEqual([
      1,
      1,
      1.25,
      1.5,
      1.75,
      2,
      2,
    ]);
    expect(calculateScanScore(100, 2)).toBe(125);
    expect(calculateScanScore(100, 5)).toBe(200);
  });

  it("increments completion streak and keeps first discovery outside the multiplier", () => {
    const first = completeScan(createInitialScoreState(), 100, true);
    expect(first).toMatchObject({
      cleanStreak: 1,
      multiplier: 1,
      scanScore: 100,
      firstDiscoveryBonus: 100,
    });
    expect(first.state).toEqual({
      cleanStreak: 1,
      scanScoreTotal: 100,
      firstDiscoveryBonusTotal: 100,
    });

    const second = completeScan(first.state, 100, false);
    expect(second.scanScore).toBe(125);
    expect(second.firstDiscoveryBonus).toBe(0);
    expect(second.state.cleanStreak).toBe(2);
  });

  it("resets only the clean streak on rock damage", () => {
    const state = completeScan(createInitialScoreState(), 50, true).state;
    const reset = resetCleanStreak(state);
    expect(reset).toEqual({
      cleanStreak: 0,
      scanScoreTotal: 50,
      firstDiscoveryBonusTotal: 50,
    });
    expect(state.cleanStreak).toBe(1);
    expect(resetCleanStreak(4)).toBe(0);
  });

  it("normalizes depth and fuel bonuses to non-negative integers with caps", () => {
    expect(calculateDepthBonus(6_000)).toBe(600);
    expect(calculateDepthBonus(6_009)).toBe(600);
    expect(calculateDepthBonus(129)).toBe(12);
    expect(calculateDepthBonus(-1)).toBe(0);
    expect(calculateDepthBonus(Number.POSITIVE_INFINITY)).toBe(0);

    expect(calculateFuelBonus(100)).toBe(1_000);
    expect(calculateFuelBonus(120)).toBe(1_000);
    expect(calculateFuelBonus(56.8)).toBe(568);
    expect(calculateFuelBonus(-1)).toBe(0);
    expect(calculateFuelBonus(Number.NaN)).toBe(0);
  });

  it("combines scan, new species, depth, and fuel into the final score", () => {
    const breakdown = calculateScoreBreakdown({
      scanScoreTotal: 225,
      firstDiscoveryBonusTotal: 100,
      reachedDepthM: 6_000,
      remainingFuel: 56.8,
    });
    expect(breakdown).toEqual({
      scanScore: 225,
      firstDiscoveryBonus: 100,
      depthBonus: 600,
      fuelBonus: 568,
      finalScore: 1_493,
    });
    expect(calculateFinalScore(225, 100, 6_000, 56.8)).toBe(1_493);
    expect(calculateFinalScore({
      scanScore: Number.NaN,
      firstDiscoveryBonus: -1,
      reachedDepthM: Number.POSITIVE_INFINITY,
      remainingFuel: -10,
    })).toBe(0);
  });
});
