/**
 * Phaser-independent rules for the player-controlled searchlight.
 *
 * The scene owns the light graphics and the current heading. This module only
 * deals with finite geometry and deterministic target selection so the same
 * result is produced in a replay, a test, or a render frame.
 */

export const SEARCHLIGHT_RANGE_PX = 260;
export const SEARCHLIGHT_HALF_ANGLE_DEGREES = 18;
export const SEARCHLIGHT_FULL_ANGLE_DEGREES =
  SEARCHLIGHT_HALF_ANGLE_DEGREES * 2;
export const SEARCHLIGHT_HALF_ANGLE_RADIANS =
  (SEARCHLIGHT_HALF_ANGLE_DEGREES * Math.PI) / 180;
export const SEARCHLIGHT_FULL_ANGLE_RADIANS =
  SEARCHLIGHT_HALF_ANGLE_RADIANS * 2;
export const SEARCHLIGHT_MAX_ROTATION_DEGREES_PER_SECOND = 240;
export const SEARCHLIGHT_MAX_ROTATION_RADIANS_PER_SECOND =
  (SEARCHLIGHT_MAX_ROTATION_DEGREES_PER_SECOND * Math.PI) / 180;
export const SEARCHLIGHT_HALF_ANGLE = SEARCHLIGHT_HALF_ANGLE_RADIANS;
export const SEARCHLIGHT_ROTATION_SPEED_DEGREES_PER_SECOND =
  SEARCHLIGHT_MAX_ROTATION_DEGREES_PER_SECOND;
export const SEARCHLIGHT_ROTATION_SPEED_RADIANS_PER_SECOND =
  SEARCHLIGHT_MAX_ROTATION_RADIANS_PER_SECOND;

const TWO_PI = Math.PI * 2;

export interface SearchlightPoint {
  readonly x: number;
  readonly y: number;
}

/** A target can use either flat coordinates or a small position object. */
export type SearchlightTarget = {
  readonly id: string;
  readonly spawnSequence: number;
} & (
  | { readonly x: number; readonly y: number }
  | { readonly position: SearchlightPoint }
);

export interface SearchlightTargetMetrics {
  readonly target: SearchlightTarget;
  readonly centerDistance: number;
  /** Absolute shortest angular difference, in radians, from the light axis. */
  readonly angleDifferenceRadians: number;
}

/** Returns a finite angle in [0, 2π), or zero for an invalid value. */
export function normalizeAngleRadians(angle: number): number {
  if (!Number.isFinite(angle)) {
    return 0;
  }

  const normalized = angle % TWO_PI;
  return normalized < 0 ? normalized + TWO_PI : normalized;
}

/** Returns the shortest signed turn from `from` to `to` in [-π, π]. */
export function shortestAngleDeltaRadians(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return 0;
  }

  let delta = (to - from) % TWO_PI;
  if (delta > Math.PI) {
    delta -= TWO_PI;
  } else if (delta < -Math.PI) {
    delta += TWO_PI;
  }
  return delta;
}

/** Returns the unsigned shortest angular difference in [0, π]. */
export const getSearchlightAngleDifference = angleDifferenceRadians;

export function angleDifferenceRadians(first: number, second: number): number {
  return Math.abs(shortestAngleDeltaRadians(first, second));
}

/**
 * Moves an angle toward its target by at most 240 degrees per second.
 * Invalid inputs are normalized to the safe initial heading (0 radians).
 */
export function advanceSearchlightAngle(
  currentAngleRadians: number,
  targetAngleRadians: number,
  elapsedSeconds: number,
): number {
  const current = normalizeAngleRadians(currentAngleRadians);
  const target = normalizeAngleRadians(targetAngleRadians);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return current;
  }

  const maximumStep =
    SEARCHLIGHT_MAX_ROTATION_RADIANS_PER_SECOND * elapsedSeconds;
  if (!Number.isFinite(maximumStep) || maximumStep <= 0) {
    return current;
  }

  const delta = shortestAngleDeltaRadians(current, target);
  if (Math.abs(delta) <= maximumStep) {
    return target;
  }

  return normalizeAngleRadians(current + Math.sign(delta) * maximumStep);
}

/** Alias for callers that describe heading changes as interpolation. */
export const interpolateSearchlightAngle = advanceSearchlightAngle;
export const rotateSearchlightTowards = advanceSearchlightAngle;
export const updateSearchlightAngle = advanceSearchlightAngle;

/** Returns whether a finite point lies inside the default light cone. */
export function isWithinSearchlight(
  origin: SearchlightPoint,
  target: SearchlightPoint,
  headingRadians: number,
  range = SEARCHLIGHT_RANGE_PX,
  halfAngleRadians = SEARCHLIGHT_HALF_ANGLE_RADIANS,
): boolean {
  return getSearchlightTargetMetrics(
    origin,
    headingRadians,
    {
      id: '',
      spawnSequence: 0,
      x: target.x,
      y: target.y,
    },
    range,
    halfAngleRadians,
  ) !== undefined;
}

/** Alias using the more explicit cone terminology. */
export const isWithinSearchlightCone = isWithinSearchlight;

/**
 * Calculates the distance and angular offset for one candidate.
 * Invalid geometry, range, angle, or sequence values are rejected.
 */
export function getSearchlightTargetMetrics(
  origin: SearchlightPoint,
  headingRadians: number,
  target: SearchlightTarget,
  range = SEARCHLIGHT_RANGE_PX,
  halfAngleRadians = SEARCHLIGHT_HALF_ANGLE_RADIANS,
): SearchlightTargetMetrics | undefined {
  const position = getTargetPosition(target);
  if (
    !isFinitePoint(origin) ||
    !isFinitePoint(position) ||
    !Number.isFinite(headingRadians) ||
    !Number.isFinite(range) ||
    range < 0 ||
    !Number.isFinite(halfAngleRadians) ||
    halfAngleRadians < 0 ||
    !Number.isFinite(target.spawnSequence)
  ) {
    return undefined;
  }

  const deltaX = position.x - origin.x;
  const deltaY = position.y - origin.y;
  const centerDistance = Math.hypot(deltaX, deltaY);
  if (!Number.isFinite(centerDistance) || centerDistance > range) {
    return undefined;
  }

  // A target at the exact origin has no meaningful bearing; treating it as
  // centered makes the rule deterministic and avoids a NaN angle.
  const targetAngle = centerDistance === 0
    ? headingRadians
    : Math.atan2(deltaY, deltaX);
  const angleDifference = angleDifferenceRadians(headingRadians, targetAngle);
  if (!Number.isFinite(angleDifference) || angleDifference > halfAngleRadians) {
    return undefined;
  }

  return {
    target,
    centerDistance,
    angleDifferenceRadians: angleDifference,
  };
}

/**
 * Chooses one illuminated target by center angle, then distance, then spawn
 * sequence. Every comparison is deterministic and invalid candidates are
 * ignored.
 */
export function selectSearchlightTarget(
  origin: SearchlightPoint,
  headingRadians: number,
  targets: readonly SearchlightTarget[],
  range = SEARCHLIGHT_RANGE_PX,
  halfAngleRadians = SEARCHLIGHT_HALF_ANGLE_RADIANS,
): SearchlightTarget | undefined {
  let selected: SearchlightTargetMetrics | undefined;

  for (const target of targets) {
    const metrics = getSearchlightTargetMetrics(
      origin,
      headingRadians,
      target,
      range,
      halfAngleRadians,
    );
    if (!metrics || !selected || compareTargetMetrics(metrics, selected) < 0) {
      if (metrics) {
        selected = metrics;
      }
    }
  }

  return selected?.target;
}

export const chooseSearchlightTarget = selectSearchlightTarget;

/**
 * Selects one target while allowing a single active set-piece to take focus.
 * Priority applies only when that target is itself inside the finite cone;
 * otherwise ordinary angle, distance, and spawn ordering is preserved.
 */
export function selectSearchlightTargetWithPriority(
  origin: SearchlightPoint,
  headingRadians: number,
  targets: readonly SearchlightTarget[],
  priorityTargetId: string | undefined,
  range = SEARCHLIGHT_RANGE_PX,
  halfAngleRadians = SEARCHLIGHT_HALF_ANGLE_RADIANS,
): SearchlightTarget | undefined {
  if (priorityTargetId !== undefined) {
    const priorityTarget = targets.find(
      (target) => target.id === priorityTargetId,
    );
    if (
      priorityTarget &&
      getSearchlightTargetMetrics(
        origin,
        headingRadians,
        priorityTarget,
        range,
        halfAngleRadians,
      )
    ) {
      return priorityTarget;
    }
  }

  return selectSearchlightTarget(
    origin,
    headingRadians,
    targets,
    range,
    halfAngleRadians,
  );
}

function compareTargetMetrics(
  first: SearchlightTargetMetrics,
  second: SearchlightTargetMetrics,
): number {
  if (first.angleDifferenceRadians !== second.angleDifferenceRadians) {
    return first.angleDifferenceRadians - second.angleDifferenceRadians;
  }
  if (first.centerDistance !== second.centerDistance) {
    return first.centerDistance - second.centerDistance;
  }
  return normalizeSpawnSequence(first.target.spawnSequence) -
    normalizeSpawnSequence(second.target.spawnSequence);
}

function getTargetPosition(target: SearchlightTarget): SearchlightPoint {
  if ('position' in target) {
    return target.position;
  }
  return { x: target.x, y: target.y };
}

function isFinitePoint(point: SearchlightPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function normalizeSpawnSequence(sequence: number): number {
  return Number.isFinite(sequence) ? sequence : Number.POSITIVE_INFINITY;
}
