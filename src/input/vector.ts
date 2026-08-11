export interface InputVector {
  x: number;
  y: number;
  magnitude: number;
}

/**
 * Converts a pointer delta into a normalized joystick vector.
 * Keeping this calculation independent from the DOM makes the input contract
 * easy to test and reusable for a future Phaser-native control.
 */
export function vectorFromDelta(
  deltaX: number,
  deltaY: number,
  maxDistance: number,
  deadZone = 0.12,
): InputVector {
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    return { x: 0, y: 0, magnitude: 0 };
  }

  const distance = Math.hypot(deltaX, deltaY);
  if (!Number.isFinite(distance) || distance === 0) {
    return { x: 0, y: 0, magnitude: 0 };
  }

  const clampedDistance = Math.min(distance, maxDistance);
  const normalizedMagnitude = clampedDistance / maxDistance;
  if (normalizedMagnitude < deadZone) {
    return { x: 0, y: 0, magnitude: 0 };
  }

  const angle = Math.atan2(deltaY, deltaX);
  const remappedMagnitude = Math.min(
    1,
    (normalizedMagnitude - deadZone) / (1 - deadZone),
  );

  return {
    x: Math.cos(angle) * remappedMagnitude,
    y: Math.sin(angle) * remappedMagnitude,
    magnitude: remappedMagnitude,
  };
}
