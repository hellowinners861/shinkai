import { describe, expect, it } from 'vitest';

import {
  GAME_HEIGHT,
  GAME_WIDTH,
} from '../src/game/config';
import {
  LARGE_CREATURE_EVENT_DURATION_SECONDS,
  LARGE_CREATURE_EVENT_PATH_Y,
  LARGE_CREATURE_EVENT_REQUIRED_SECONDS,
} from '../src/game/largeCreatureEventRules';
import { SPECIES_COLLISION_RADIUS } from '../src/game/speciesRules';
import {
  advanceSearchlightAngle,
  angleDifferenceRadians,
  SEARCHLIGHT_FULL_ANGLE_DEGREES,
  SEARCHLIGHT_HALF_ANGLE_DEGREES,
  SEARCHLIGHT_HALF_ANGLE_RADIANS,
  SEARCHLIGHT_MAX_ROTATION_DEGREES_PER_SECOND,
  SEARCHLIGHT_RANGE_PX,
  selectSearchlightTarget,
  selectSearchlightTargetWithPriority,
  shortestAngleDeltaRadians,
  isWithinSearchlight,
  type SearchlightTarget,
} from '../src/game/searchlightRules';

function target(overrides: Partial<SearchlightTarget> = {}): SearchlightTarget {
  return {
    id: 'target-1',
    x: 100,
    y: 0,
    spawnSequence: 1,
    ...overrides,
  } as SearchlightTarget;
}

describe('searchlight rules', () => {
  it('uses the approved 260px range and 36-degree cone', () => {
    expect(SEARCHLIGHT_RANGE_PX).toBe(260);
    expect(SEARCHLIGHT_HALF_ANGLE_DEGREES).toBe(18);
    expect(SEARCHLIGHT_FULL_ANGLE_DEGREES).toBe(36);
    expect(SEARCHLIGHT_HALF_ANGLE_RADIANS).toBeCloseTo(Math.PI / 10, 12);
    expect(SEARCHLIGHT_MAX_ROTATION_DEGREES_PER_SECOND).toBe(240);
  });

  it('accepts the inclusive center and cone boundaries, but not outside them', () => {
    const origin = { x: 0, y: 0 };
    const heading = 0;
    const boundaryAngle = SEARCHLIGHT_HALF_ANGLE_RADIANS;

    expect(isWithinSearchlight(origin, { x: SEARCHLIGHT_RANGE_PX, y: 0 }, heading)).toBe(true);
    expect(isWithinSearchlight(origin, {
      x: Math.cos(boundaryAngle) * SEARCHLIGHT_RANGE_PX,
      y: Math.sin(boundaryAngle) * SEARCHLIGHT_RANGE_PX,
    }, heading)).toBe(true);
    expect(isWithinSearchlight(origin, {
      x: Math.cos(boundaryAngle + 1e-6) * 100,
      y: Math.sin(boundaryAngle + 1e-6) * 100,
    }, heading)).toBe(false);
    expect(isWithinSearchlight(origin, { x: SEARCHLIGHT_RANGE_PX + 1, y: 0 }, heading)).toBe(false);
  });

  it('rejects non-finite geometry rather than producing a hit', () => {
    expect(isWithinSearchlight(
      { x: Number.NaN, y: 0 },
      { x: 10, y: 0 },
      0,
    )).toBe(false);
    expect(isWithinSearchlight(
      { x: 0, y: 0 },
      { x: Number.POSITIVE_INFINITY, y: 0 },
      0,
    )).toBe(false);
    expect(selectSearchlightTarget(
      { x: 0, y: 0 },
      Number.NaN,
      [target()],
    )).toBeUndefined();
  });

  it('selects by center angle, then distance, then spawn sequence', () => {
    const selected = selectSearchlightTarget(
      { x: 0, y: 0 },
      0,
      [
        target({ id: 'far-centered', x: 160, y: 0, spawnSequence: 9 }),
        target({ id: 'near-offset', x: 80, y: 20, spawnSequence: 0 }),
        target({ id: 'near-centered-late', x: 80, y: 0, spawnSequence: 8 }),
        target({ id: 'near-centered-early', x: 80, y: 0, spawnSequence: 2 }),
      ],
    );

    expect(selected?.id).toBe('near-centered-early');
  });

  it('gives an active large target focus only while it is in the cone', () => {
    const normal = target({
      id: 'normal',
      x: 40,
      y: 0,
      spawnSequence: 1,
    });
    const large = target({
      id: 'large',
      x: 180,
      y: 0,
      spawnSequence: 999,
    });
    expect(selectSearchlightTargetWithPriority(
      { x: 0, y: 0 },
      0,
      [normal, large],
      'large',
    )?.id).toBe('large');

    const outside = target({
      id: 'large',
      x: 0,
      y: 180,
      spawnSequence: 999,
    });
    expect(selectSearchlightTargetWithPriority(
      { x: 0, y: 0 },
      0,
      [normal, outside],
      'large',
    )?.id).toBe('normal');
  });

  it('keeps the centered large-creature track in the forward cone for identification', () => {
    const origin = {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
    };
    const radius = SPECIES_COLLISION_RADIUS * 2.8;
    const startX = -radius;
    const endX = GAME_WIDTH + radius;
    const travelDistance = endX - startX;
    const firstX = origin.x;
    const lastX = Math.min(
      origin.x + SEARCHLIGHT_RANGE_PX,
      endX,
    );
    const windowSeconds = (
      (lastX - firstX) / travelDistance
    ) * LARGE_CREATURE_EVENT_DURATION_SECONDS;

    expect(LARGE_CREATURE_EVENT_PATH_Y).toBe(GAME_HEIGHT / 2);
    expect(isWithinSearchlight(
      origin,
      { x: firstX, y: LARGE_CREATURE_EVENT_PATH_Y },
      0,
    )).toBe(true);
    expect(isWithinSearchlight(
      origin,
      { x: lastX, y: LARGE_CREATURE_EVENT_PATH_Y },
      0,
    )).toBe(true);
    expect(windowSeconds).toBeGreaterThanOrEqual(
      LARGE_CREATURE_EVENT_REQUIRED_SECONDS,
    );
  });

  it('wraps interpolation across 0/360 degrees and caps rotation speed', () => {
    const almostFullTurn = (Math.PI * 2) - 0.1;
    const wrapped = advanceSearchlightAngle(0.1, almostFullTurn, 1);
    expect(angleDifferenceRadians(0.1, wrapped)).toBeCloseTo(0.2, 10);
    expect(wrapped).toBeGreaterThan(0);

    const maximumStep = (240 * Math.PI) / 180;
    const capped = advanceSearchlightAngle(0, Math.PI, 0.5);
    expect(angleDifferenceRadians(0, capped)).toBeCloseTo(maximumStep * 0.5, 10);

    const arrived = advanceSearchlightAngle(0, Math.PI / 4, 1);
    expect(arrived).toBeCloseTo(Math.PI / 4, 12);
    expect(shortestAngleDeltaRadians(almostFullTurn, 0.1)).toBeCloseTo(0.2, 12);
  });

  it('keeps invalid elapsed time finite and leaves the current heading stable', () => {
    expect(advanceSearchlightAngle(1, 2, 0)).toBeCloseTo(1, 12);
    expect(advanceSearchlightAngle(1, 2, Number.NaN)).toBeCloseTo(1, 12);
    expect(Number.isFinite(advanceSearchlightAngle(Number.NaN, Number.POSITIVE_INFINITY, 1))).toBe(true);
  });
});
