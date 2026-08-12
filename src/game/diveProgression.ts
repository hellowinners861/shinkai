export const DIVE_START_DEPTH_M = 0;
export const DIVE_TARGET_DEPTH_M = 6_000;
export const DIVE_AUTO_DESCENT_SPEED_M_PER_SECOND = 25;
export const DIVE_START_FUEL = 100;
export const DIVE_MAX_FUEL = 100;
export const DIVE_FUEL_CONSUMPTION_PER_SECOND = 0.18;
export const MAX_DIVE_FRAME_SECONDS = 0.25;

export type DiveStatus = "descending" | "cleared" | "depleted";

export interface DiveProgressionState {
  depthM: number;
  fuel: number;
  elapsedSeconds: number;
  status: DiveStatus;
}

/** Creates a fresh progression state for a new dive. */
export function createInitialDiveProgressionState(): DiveProgressionState {
  return {
    depthM: DIVE_START_DEPTH_M,
    fuel: DIVE_START_FUEL,
    elapsedSeconds: 0,
    status: "descending",
  };
}

/**
 * Limits one Scene update to the amount of time the progression may consume.
 * The pure progression function itself accepts a complete finite duration so
 * it can also be used for deterministic simulation and unit tests.
 */
export function clampDiveFrameSeconds(frameSeconds: number): number {
  if (!Number.isFinite(frameSeconds) || frameSeconds <= 0) {
    return 0;
  }

  return Math.min(frameSeconds, MAX_DIVE_FRAME_SECONDS);
}

/** Advances the dive by a finite, positive duration in seconds. */
export function advanceDiveProgression(
  state: DiveProgressionState,
  elapsedSeconds: number,
): DiveProgressionState {
  if (state.status !== "descending") {
    return state;
  }

  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return state;
  }

  const depthM = clamp(
    state.depthM + DIVE_AUTO_DESCENT_SPEED_M_PER_SECOND * elapsedSeconds,
    DIVE_START_DEPTH_M,
    DIVE_TARGET_DEPTH_M,
  );
  const fuel = clamp(
    state.fuel - DIVE_FUEL_CONSUMPTION_PER_SECOND * elapsedSeconds,
    0,
    DIVE_MAX_FUEL,
  );
  const nextStatus = getDiveStatus(depthM, fuel);

  return {
    depthM,
    fuel,
    elapsedSeconds: state.elapsedSeconds + elapsedSeconds,
    status: nextStatus,
  };
}

/** Applies a signed fuel adjustment without reviving a terminal dive. */
export function adjustDiveFuel(
  state: DiveProgressionState,
  fuelDelta: number,
): DiveProgressionState {
  if (state.status !== 'descending') {
    return state;
  }

  if (!Number.isFinite(fuelDelta) || fuelDelta === 0) {
    return state;
  }

  const fuel = clamp(state.fuel + fuelDelta, 0, DIVE_MAX_FUEL);

  return {
    ...state,
    fuel,
    status: getDiveStatus(state.depthM, fuel),
  };
}

/** Returns the terminal status implied by the clamped progression values. */
export function getDiveStatus(depthM: number, fuel: number): DiveStatus {
  if (fuel <= 0) {
    return "depleted";
  }

  if (depthM >= DIVE_TARGET_DEPTH_M) {
    return "cleared";
  }

  return "descending";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
