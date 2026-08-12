import { describe, expect, it } from 'vitest';

import {
  advanceEncounterSchedule,
  canTakeRockDamage,
  circlesOverlap,
  createInitialEncounterScheduleState,
  getDueEncounterSpawns,
  ROCK_INVULNERABILITY_SECONDS,
  updateInvulnerability,
} from '../src/game/encounterRules';

describe('encounter rules', () => {
  it('returns deterministic rock and recovery spawns in time and lane order', () => {
    expect(getDueEncounterSpawns(0, 1.49)).toEqual([]);
    expect(getDueEncounterSpawns(0, 1.5)).toEqual([
      { kind: 'rock', atSeconds: 1.5, lane: 'center' },
    ]);

    expect(getDueEncounterSpawns(0, 30)).toEqual([
      { kind: 'rock', atSeconds: 1.5, lane: 'center' },
      { kind: 'rock', atSeconds: 6.5, lane: 'leftOuter' },
      { kind: 'recovery', atSeconds: 9, lane: 'center' },
      { kind: 'rock', atSeconds: 11.5, lane: 'rightOuter' },
      { kind: 'rock', atSeconds: 16.5, lane: 'leftInner' },
      { kind: 'rock', atSeconds: 21.5, lane: 'rightInner' },
      { kind: 'rock', atSeconds: 26.5, lane: 'center' },
      { kind: 'recovery', atSeconds: 29, lane: 'rightInner' },
    ]);
  });

  it('does not re-acquire a boundary and handles paused or long updates', () => {
    const initial = createInitialEncounterScheduleState();
    const first = advanceEncounterSchedule(initial, 1.5);
    expect(first.spawns).toHaveLength(1);

    const paused = advanceEncounterSchedule(first.state, 1.5);
    expect(paused.spawns).toEqual([]);
    expect(paused.state).toBe(first.state);

    const later = advanceEncounterSchedule(first.state, 16.5);
    expect(later.spawns.map((spawn) => spawn.atSeconds)).toEqual([
      6.5,
      9,
      11.5,
      16.5,
    ]);
    expect(advanceEncounterSchedule(later.state, 15).spawns).toEqual([]);
  });

  it('treats touching circles as collisions but excludes separated circles', () => {
    expect(
      circlesOverlap(
        { x: 0, y: 0, radius: 24 },
        { x: 46, y: 0, radius: 22 },
      ),
    ).toBe(true);
    expect(
      circlesOverlap(
        { x: 0, y: 0, radius: 24 },
        { x: 47, y: 0, radius: 22 },
      ),
    ).toBe(false);
  });

  it('counts down invulnerability, blocks damage while active, and allows it at zero', () => {
    expect(ROCK_INVULNERABILITY_SECONDS).toBe(1);
    expect(canTakeRockDamage(ROCK_INVULNERABILITY_SECONDS)).toBe(false);
    expect(updateInvulnerability(1, 0.25)).toBeCloseTo(0.75, 10);
    expect(canTakeRockDamage(0.75)).toBe(false);
    expect(updateInvulnerability(1, 2)).toBe(0);
    expect(updateInvulnerability(0, 1)).toBe(0);
    expect(canTakeRockDamage(0)).toBe(true);
    expect(updateInvulnerability(0.5, -1)).toBe(0.5);
  });
});
