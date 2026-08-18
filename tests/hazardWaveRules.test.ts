import { describe, expect, it } from 'vitest';

import {
  generateHazardWaves,
  generateHazardWaveSequence,
  getDepthBand,
  getDepthBandNumber,
  getRecoveryLane,
  HAZARD_DEPTH_BANDS,
  HAZARD_WARNING_LEAD_SECONDS,
  isHazardWarningVisible,
  MAX_HAZARD_STAGGER_SECONDS,
  RECOVERY_FIRST_SPAWN_SECONDS,
  RECOVERY_INTERVAL_SECONDS,
  RECOVERY_LANES,
  resolveRecoverySpawn,
  scheduleRecoverySpawns,
  simulateStationaryCenter,
  validateHazardWave,
} from '../src/game/hazardWaveRules';

describe('hazard wave rules', () => {
  it('exposes the four documented bands and their interval/count rules', () => {
    expect(HAZARD_DEPTH_BANDS.map((band) => [
      band.band,
      band.waveIntervalSeconds,
      band.minRockCount,
      band.maxRockCount,
    ])).toEqual([
      [1, 6, 1, 1],
      [2, 5.5, 1, 2],
      [3, 5, 2, 3],
      [4, 4.5, 3, 3],
    ]);
    expect(getDepthBandNumber(0)).toBe(1);
    expect(getDepthBand(999).band).toBe(1);
    expect(getDepthBand(1_000).band).toBe(2);
    expect(getDepthBand(2_500).band).toBe(3);
    expect(getDepthBand(4_000).band).toBe(4);
  });

  it('generates deterministic, passable waves with moved safe lanes', () => {
    const first = generateHazardWaves({ seed: 19 });
    const second = generateHazardWaves({ seed: 19 });
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);

    const centerBlockedBands = new Set(
      first.filter((wave) => wave.centerBlocked).map((wave) => wave.band),
    );
    expect(centerBlockedBands).toEqual(new Set([1, 2, 3, 4]));

    for (const wave of first) {
      expect(validateHazardWave(wave).valid).toBe(true);
      expect(wave.safeLanes.length).toBeGreaterThanOrEqual(
        wave.band <= 2 ? 2 : 1,
      );
      expect(wave.warningAtSeconds).toBe(
        wave.atSeconds - HAZARD_WARNING_LEAD_SECONDS,
      );
      expect(wave.maxStaggerSeconds).toBeLessThanOrEqual(
        MAX_HAZARD_STAGGER_SECONDS,
      );
      expect(isHazardWarningVisible(wave, wave.warningAtSeconds)).toBe(true);
      expect(isHazardWarningVisible(wave, wave.atSeconds)).toBe(false);
    }

    for (let index = 1; index < first.length; index += 1) {
      expect(new Set(first[index]!.safeLanes)).not.toEqual(
        new Set(first[index - 1]!.safeLanes),
      );
    }
  });

  it('keeps within-band intervals and rock counts in their table range', () => {
    const waves = generateHazardWaves({ seed: 4 });
    for (const [bandNumber, rule] of HAZARD_DEPTH_BANDS.entries()) {
      const bandWaves = waves.filter((wave) => wave.band === rule.band);
      expect(bandWaves.length).toBeGreaterThan(0);
      for (let index = 1; index < bandWaves.length; index += 1) {
        expect(bandWaves[index]!.atSeconds - bandWaves[index - 1]!.atSeconds)
          .toBeCloseTo(rule.waveIntervalSeconds, 10);
      }
      expect(bandNumber).toBe(rule.band - 1);
      for (const wave of bandWaves) {
        expect(wave.rockCount).toBeGreaterThanOrEqual(rule.minRockCount);
        expect(wave.rockCount).toBeLessThanOrEqual(rule.maxRockCount);
      }
    }
  });

  it('allows a caller to produce a fixed band preview without scene state', () => {
    const waves = generateHazardWaveSequence(2, 5, { seed: 7 });
    expect(waves).toHaveLength(5);
    expect(waves.map((wave) => wave.band)).toEqual([2, 2, 2, 2, 2]);
    expect(waves.map((wave) => wave.atSeconds)).toEqual([5.5, 11, 16.5, 22, 27.5]);
  });
});

describe('recovery schedule rules', () => {
  it('uses the 15 second first spawn, 36 second interval, and non-center cycle', () => {
    expect(scheduleRecoverySpawns({ endSeconds: 130 }).spawns.map((spawn) => ({
      atSeconds: spawn.atSeconds,
      lane: spawn.lane,
    }))).toEqual([
      { atSeconds: 15, lane: 'leftInner' },
      { atSeconds: 51, lane: 'rightInner' },
      { atSeconds: 87, lane: 'leftOuter' },
      { atSeconds: 123, lane: 'rightOuter' },
    ]);
    expect(RECOVERY_FIRST_SPAWN_SECONDS).toBe(15);
    expect(RECOVERY_INTERVAL_SECONDS).toBe(36);
    expect(RECOVERY_LANES).not.toContain('center');
    expect([0, 1, 2, 3, 4].map(getRecoveryLane)).toEqual([
      'leftInner',
      'rightInner',
      'leftOuter',
      'rightOuter',
      'leftInner',
    ]);
  });

  it('shifts a blocked recovery by at most two seconds and can report a skip', () => {
    const blockedWave = {
      kind: 'hazard' as const,
      waveIndex: 0,
      bandWaveIndex: 0,
      band: 3 as const,
      atSeconds: 15,
      depthM: 2_875,
      rocks: [{
        lane: 'leftInner' as const,
        staggerSeconds: 0,
        atSeconds: 15,
      }],
      rockLanes: ['leftInner' as const],
      rockCount: 1,
      safeLanes: ['center' as const],
      centerBlocked: false,
      warningAtSeconds: 12.5,
      warningLeadSeconds: 2.5,
      maxStaggerSeconds: 0,
    };
    const shifted = resolveRecoverySpawn(
      0,
      15,
      'leftInner',
      [blockedWave],
    );
    expect(shifted).toBeDefined();
    expect(shifted!.shiftSeconds).toBeGreaterThan(0);
    expect(shifted!.shiftSeconds).toBeLessThanOrEqual(2);
    expect(shifted!.atSeconds).toBeGreaterThan(15);

    const impossibleWave = {
      ...blockedWave,
      rocks: [{
        lane: 'leftInner' as const,
        staggerSeconds: 0,
        atSeconds: 15,
      }],
      safeLanes: ['center' as const],
    };
    const impossible = resolveRecoverySpawn(
      0,
      15,
      'leftInner',
      Array.from({ length: 9 }, (_, index) => ({
        ...impossibleWave,
        waveIndex: index,
        atSeconds: 15 + index * 0.25,
        rocks: [{
          lane: 'leftInner' as const,
          staggerSeconds: 0,
          atSeconds: 15 + index * 0.25,
        }],
      })),
    );
    expect(impossible).toBeUndefined();
  });
});

describe('zero-input hazard simulation', () => {
  it('depletes a stationary center pilot between 2,500m and 4,500m', () => {
    const result = simulateStationaryCenter({ seed: 11 });
    expect(result.status).toBe('depleted');
    expect(result.remainingFuel).toBe(0);
    expect(result.reachedDepthM).toBeGreaterThanOrEqual(2_500);
    expect(result.reachedDepthM).toBeLessThanOrEqual(4_500);
    expect(result.collisionCount).toBeGreaterThan(0);
  });
});
