import { describe, expect, it } from 'vitest';

import {
  ACTIVE_SCAN_DECAY_SECONDS_PER_SECOND,
  ACTIVE_SCAN_RANGE_PX,
  advanceScanTarget,
  advanceScanTargets,
  getScanProgressPercent,
  getScanRequiredSeconds,
  isWithinActiveScanRange,
  selectActiveScanTarget,
  SCAN_REQUIRED_SECONDS,
  type ScanTarget,
} from '../src/game/scanRules';

function target(overrides: Partial<ScanTarget> = {}): ScanTarget {
  return {
    id: 'target-1',
    spawnSequence: 1,
    centerDistance: 40,
    rarity: 'common',
    ...overrides,
  };
}

describe('active scan rules', () => {
  it('uses the approved duration for every rarity', () => {
    expect(SCAN_REQUIRED_SECONDS).toEqual({
      common: 0.70,
      uncommon: 0.85,
      rare: 1.05,
      very_rare: 1.30,
      legendary: 1.60,
    });

    for (const [rarity, seconds] of Object.entries(SCAN_REQUIRED_SECONDS)) {
      expect(getScanRequiredSeconds(rarity as ScanTarget['rarity'])).toBe(seconds);
    }
    expect(getScanRequiredSeconds('invalid' as ScanTarget['rarity'])).toBe(0);
  });

  it('uses an inclusive 96px active range and rejects invalid distances', () => {
    expect(ACTIVE_SCAN_RANGE_PX).toBe(96);
    expect(isWithinActiveScanRange(0)).toBe(true);
    expect(isWithinActiveScanRange(96)).toBe(true);
    expect(isWithinActiveScanRange(96.000_001)).toBe(false);
    expect(isWithinActiveScanRange(-0.001)).toBe(false);
    expect(isWithinActiveScanRange(Number.NaN)).toBe(false);
    expect(isWithinActiveScanRange(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('selects one nearest unfinished target, then the earlier spawn sequence', () => {
    const selected = selectActiveScanTarget([
      target({ id: 'too-far', centerDistance: 120, spawnSequence: 0 }),
      target({ id: 'completed', centerDistance: 1, spawnSequence: 0, completed: true }),
      target({ id: 'tie-later', centerDistance: 24, spawnSequence: 8 }),
      target({ id: 'tie-earlier', centerDistance: 24, spawnSequence: 3 }),
      target({ id: 'nearest', centerDistance: 12, spawnSequence: 99 }),
    ]);

    expect(selected?.id).toBe('nearest');
    expect(
      selectActiveScanTarget([
        target({ id: 'tie-later', centerDistance: 24, spawnSequence: 8 }),
        target({ id: 'tie-earlier', centerDistance: 24, spawnSequence: 3 }),
      ])?.id,
    ).toBe('tie-earlier');
  });

  it('keeps progress per instance while only the selected instance advances', () => {
    const input = [
      target({ id: 'near', centerDistance: 10, progressSeconds: 0.2 }),
      target({ id: 'far', centerDistance: 20, progressSeconds: 0.8, rarity: 'rare' }),
    ];

    const update = advanceScanTargets(input, 0.5);

    expect(update.activeTargetId).toBe('near');
    expect(update.targets[0]).toMatchObject({
      id: 'near',
      progressSeconds: 0.70,
      completed: true,
    });
    expect(update.targets[1]).toMatchObject({
      id: 'far',
      progressSeconds: 0.8 - 0.5 * ACTIVE_SCAN_DECAY_SECONDS_PER_SECOND,
      completed: false,
    });
    expect(update.completedTargetIds).toEqual(['near']);
  });

  it('does not activate duplicate ids twice', () => {
    const update = advanceScanTargets([
      target({ id: 'same-id', centerDistance: 10, progressSeconds: 0.2 }),
      target({ id: 'same-id', centerDistance: 20, progressSeconds: 0.2 }),
    ], 0.4);

    expect(update.activeTargetId).toBe('same-id');
    expect(update.targets[0]?.progressSeconds).toBeCloseTo(0.6, 10);
    expect(update.targets[1]?.progressSeconds).toBe(0);
  });

  it('decays non-active progress by 0.75 per second and clamps at zero', () => {
    const update = advanceScanTargets([
      target({ id: 'active', centerDistance: 10, progressSeconds: 0.1 }),
      target({ id: 'inactive', centerDistance: 20, progressSeconds: 0.2 }),
    ], 1);

    expect(update.targets[0]?.progressSeconds).toBeCloseTo(0.70, 10);
    expect(update.targets[1]?.progressSeconds).toBe(0);
    expect(ACTIVE_SCAN_DECAY_SECONDS_PER_SECOND).toBe(0.75);
  });

  it('emits completion once and leaves completed progress immutable', () => {
    const first = advanceScanTargets([
      target({ id: 'complete-once', progressSeconds: 0.6, centerDistance: 10 }),
    ], 0.1);

    expect(first.completedTargetIds).toEqual(['complete-once']);
    expect(first.targets[0]).toMatchObject({
      progressSeconds: 0.70,
      completed: true,
    });

    const second = advanceScanTargets(first.targets, 2);
    expect(second.activeTargetId).toBeUndefined();
    expect(second.completedTargetIds).toEqual([]);
    expect(second.targets[0]).toMatchObject({
      progressSeconds: 0.70,
      completed: true,
    });
  });

  it('normalizes invalid elapsed time to no progress or decay', () => {
    const input = [
      target({ id: 'first', progressSeconds: 0.4, centerDistance: 10 }),
      target({ id: 'second', progressSeconds: 0.4, centerDistance: 20 }),
    ];

    for (const elapsedSeconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const update = advanceScanTargets(input, elapsedSeconds);
      expect(update.targets.map((item) => item.progressSeconds)).toEqual([0.4, 0.4]);
      expect(update.completedTargetIds).toEqual([]);
    }

    const direct = advanceScanTarget(input[0]!, true, Number.NaN);
    expect(direct.progressSeconds).toBe(0.4);
  });

  it('returns a clamped 0–100 progress percentage', () => {
    expect(getScanProgressPercent(target({ progressSeconds: 0 }))).toBe(0);
    expect(getScanProgressPercent(target({ progressSeconds: 0.35 }))).toBe(50);
    expect(getScanProgressPercent(target({ progressSeconds: 99 }))).toBe(100);
    expect(getScanProgressPercent(target({ progressSeconds: -1 }))).toBe(0);
    expect(getScanProgressPercent(target({ progressSeconds: Number.NaN }))).toBe(0);
    expect(getScanProgressPercent(target({ progressSeconds: Number.POSITIVE_INFINITY }))).toBe(0);
  });
});
