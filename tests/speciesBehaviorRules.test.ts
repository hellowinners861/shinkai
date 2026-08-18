import { describe, expect, it } from 'vitest';

import {
  createSpeciesBehaviorPlan,
  getSpeciesBehaviorPosition,
  getSpeciesBehaviorProfile,
  getSpeciesBehaviorVelocity,
  getSpeciesBehaviorVisualState,
  hasSpeciesBehaviorExited,
  SPECIES_CATEGORY_BEHAVIOR_KINDS,
  type SpeciesBehaviorSpecies,
} from '../src/game/speciesBehaviorRules';

const categories: readonly SpeciesBehaviorSpecies[] = [
  { sourceCatalogId: 'F001', category: 'fish' },
  { sourceCatalogId: 'I001', category: 'gelatinous_plankton' },
  { sourceCatalogId: 'I021', category: 'squid' },
  { sourceCatalogId: 'I041', category: 'octopus' },
  { sourceCatalogId: 'I065', category: 'crab' },
  { sourceCatalogId: 'I072', category: 'shrimp' },
  { sourceCatalogId: 'I085', category: 'other_invertebrate' },
];

describe('category-specific species behavior rules', () => {
  it('covers every V3 category with a distinct behavior kind', () => {
    const kinds = categories.map((species, ordinal) =>
      getSpeciesBehaviorProfile(species, ordinal).kind,
    );

    expect(kinds).toEqual([
      'fish_snake',
      'gelatinous_float',
      'squid_burst',
      'octopus_crawl',
      'crab_stop_go',
      'shrimp_zigzag',
      'other_drift',
    ]);
    expect(new Set(kinds).size).toBe(SPECIES_CATEGORY_BEHAVIOR_KINDS.length);
  });

  it('replays identical positions and profiles for the same identity and time', () => {
    for (const [ordinal, species] of categories.entries()) {
      const firstPlan = createSpeciesBehaviorPlan(species, ordinal, 20);
      const secondPlan = createSpeciesBehaviorPlan(species, ordinal, 20);
      expect(secondPlan).toEqual(firstPlan);

      for (const time of [0, 0.25, 1.5, 7.75, Number.NaN, Infinity]) {
        expect(getSpeciesBehaviorPosition(firstPlan, time)).toEqual(
          getSpeciesBehaviorPosition(secondPlan, time),
        );
      }
    }
  });

  it('starts and ends outside the fixed playfield for all categories', () => {
    for (const [ordinal, species] of categories.entries()) {
      const plan = createSpeciesBehaviorPlan(species, ordinal);
      const start = getSpeciesBehaviorPosition(plan, 0);
      const end = getSpeciesBehaviorPosition(plan, 1_000_000);

      expect(hasSpeciesBehaviorExited(plan, start)).toBe(false);
      expect(hasSpeciesBehaviorExited(plan, plan.end)).toBe(true);
      expect(Number.isFinite(start.x)).toBe(true);
      expect(Number.isFinite(start.y)).toBe(true);
      expect(Number.isFinite(end.x)).toBe(true);
      expect(Number.isFinite(end.y)).toBe(true);
      expect(plan.start).toEqual(start);
    }
  });

  it('exposes the distinct movement signatures', () => {
    const fish = createSpeciesBehaviorPlan(categories[0]!, 0);
    const jelly = createSpeciesBehaviorPlan(categories[1]!, 1);
    const squid = createSpeciesBehaviorPlan(categories[2]!, 2);
    const octopus = createSpeciesBehaviorPlan(categories[3]!, 3);
    const crab = createSpeciesBehaviorPlan(categories[4]!, 4);
    const shrimp = createSpeciesBehaviorPlan(categories[5]!, 5);
    const other = createSpeciesBehaviorPlan(categories[6]!, 6);

    expect(fish.axis).toBe('horizontal');
    expect(jelly.axis).toBe('vertical');
    expect(jelly.direction).toBe(-1);
    expect(squid.kind).toBe('squid_burst');
    expect(squid.baseSpeedPxPerSecond).toBeGreaterThan(0);
    expect(octopus.laneCoordinate).toBeGreaterThan(500);
    expect(octopus.cycleSeconds).toBeGreaterThan(0);
    expect(crab.laneCoordinate).toBeGreaterThan(600);
    expect(crab.cycleSeconds).toBeGreaterThan(0);
    expect(shrimp.frequencyHz).toBeGreaterThan(1);
    expect(shrimp.amplitudePx).toBeGreaterThan(0);
    expect(other.baseSpeedPxPerSecond).toBeLessThan(30);

    expect(getSpeciesBehaviorPosition(fish, 0.3).y).not.toBe(
      getSpeciesBehaviorPosition(fish, 0).y,
    );
    expect(getSpeciesBehaviorPosition(shrimp, 0.3).y).not.toBe(
      getSpeciesBehaviorPosition(shrimp, 0).y,
    );
  });

  it('keeps every gelatinous profile moving upward', () => {
    for (let ordinal = 0; ordinal < 12; ordinal += 1) {
      const plan = createSpeciesBehaviorPlan(
        { sourceCatalogId: 'J' + String(ordinal), category: 'gelatinous_plankton' },
        ordinal,
      );
      expect(plan.direction).toBe(-1);
      expect(plan.start.y).toBeGreaterThan(plan.end.y);
    }
  });

  it('keeps velocities and visual modulation finite', () => {
    for (const [ordinal, species] of categories.entries()) {
      const plan = createSpeciesBehaviorPlan(species, ordinal);
      for (const time of [0, 0.5, 12, Number.NaN, Number.POSITIVE_INFINITY]) {
        const velocity = getSpeciesBehaviorVelocity(plan, time);
        const visual = getSpeciesBehaviorVisualState(plan, time);
        expect(Number.isFinite(velocity.x)).toBe(true);
        expect(Number.isFinite(velocity.y)).toBe(true);
        expect(Number.isFinite(visual.alpha)).toBe(true);
        expect(Number.isFinite(visual.scale)).toBe(true);
        expect(visual.alpha).toBeGreaterThan(0);
        expect(visual.scale).toBeGreaterThan(0);
      }
    }
  });
});
