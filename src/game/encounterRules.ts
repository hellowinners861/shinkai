export const ROCK_FUEL_DAMAGE = 10;
export const RECOVERY_FUEL_GAIN = 25;
export const ROCK_INVULNERABILITY_SECONDS = 1;

export const ROCK_FIRST_SPAWN_SECONDS = 1.5;
export const ROCK_SPAWN_INTERVAL_SECONDS = 5;
export const RECOVERY_FIRST_SPAWN_SECONDS = 9;
export const RECOVERY_SPAWN_INTERVAL_SECONDS = 20;

export const PLAYER_COLLISION_RADIUS = 24;
export const RECOVERY_COLLISION_RADIUS = 22;

export const ROCK_SPAWN_LANES = [
  'center',
  'leftOuter',
  'rightOuter',
  'leftInner',
  'rightInner',
] as const;

export const RECOVERY_SPAWN_LANES = [
  'center',
  'rightInner',
  'leftInner',
] as const;

export type EncounterKind = 'rock' | 'recovery';
export type EncounterLane =
  | (typeof ROCK_SPAWN_LANES)[number]
  | (typeof RECOVERY_SPAWN_LANES)[number];

export interface EncounterSpawn {
  kind: EncounterKind;
  atSeconds: number;
  lane: EncounterLane;
}

export type ScheduledEncounter = EncounterSpawn;

export interface EncounterScheduleState {
  lastElapsedSeconds: number;
}

export interface EncounterScheduleUpdate {
  state: EncounterScheduleState;
  spawns: EncounterSpawn[];
}

/** Creates a cursor for a new dive's deterministic encounter schedule. */
export function createInitialEncounterScheduleState(): EncounterScheduleState {
  return { lastElapsedSeconds: 0 };
}

/**
 * Returns schedule boundaries crossed by one elapsed-time interval.
 * A boundary is included only when it is greater than the previous time and
 * less than or equal to the current time.
 */
export function getDueEncounterSpawns(
  previousElapsedSeconds: number,
  currentElapsedSeconds: number,
): EncounterSpawn[] {
  if (
    !Number.isFinite(previousElapsedSeconds) ||
    !Number.isFinite(currentElapsedSeconds) ||
    currentElapsedSeconds <= previousElapsedSeconds
  ) {
    return [];
  }

  const rockSpawns = getDueSpawnsForSchedule(
    'rock',
    previousElapsedSeconds,
    currentElapsedSeconds,
  );
  const recoverySpawns = getDueSpawnsForSchedule(
    'recovery',
    previousElapsedSeconds,
    currentElapsedSeconds,
  );

  return [...rockSpawns, ...recoverySpawns].sort(compareSpawns);
}

/**
 * Advances the schedule cursor to a dive elapsed time and returns each newly
 * due encounter. The input state is never mutated.
 */
export function advanceEncounterSchedule(
  state: EncounterScheduleState,
  currentElapsedSeconds: number,
): EncounterScheduleUpdate {
  if (
    !Number.isFinite(state.lastElapsedSeconds) ||
    !Number.isFinite(currentElapsedSeconds) ||
    currentElapsedSeconds <= state.lastElapsedSeconds
  ) {
    return { state, spawns: [] };
  }

  return {
    state: { lastElapsedSeconds: currentElapsedSeconds },
    spawns: getDueEncounterSpawns(
      state.lastElapsedSeconds,
      currentElapsedSeconds,
    ),
  };
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

/** Returns true when two finite, non-negative-radius circles overlap. */
export function circlesOverlap(first: Circle, second: Circle): boolean {
  if (
    !isValidCircle(first) ||
    !isValidCircle(second)
  ) {
    return false;
  }

  const combinedRadius = first.radius + second.radius;
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;

  return deltaX * deltaX + deltaY * deltaY <= combinedRadius * combinedRadius;
}

/** Decreases an invulnerability timer without allowing it below zero. */
export function updateInvulnerability(
  remainingSeconds: number,
  elapsedSeconds: number,
): number {
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) {
    return 0;
  }

  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return remainingSeconds;
  }

  return Math.max(0, remainingSeconds - elapsedSeconds);
}

/** Returns whether a rock collision may currently apply damage. */
export function canTakeRockDamage(remainingInvulnerabilitySeconds: number): boolean {
  return Number.isFinite(remainingInvulnerabilitySeconds) &&
    remainingInvulnerabilitySeconds <= 0;
}

function getDueSpawnsForSchedule(
  kind: EncounterKind,
  previousElapsedSeconds: number,
  currentElapsedSeconds: number,
): EncounterSpawn[] {
  const firstSpawnSeconds = kind === 'rock'
    ? ROCK_FIRST_SPAWN_SECONDS
    : RECOVERY_FIRST_SPAWN_SECONDS;
  const intervalSeconds = kind === 'rock'
    ? ROCK_SPAWN_INTERVAL_SECONDS
    : RECOVERY_SPAWN_INTERVAL_SECONDS;
  const lanes = kind === 'rock' ? ROCK_SPAWN_LANES : RECOVERY_SPAWN_LANES;
  const firstIndex = Math.max(
    0,
    Math.floor((previousElapsedSeconds - firstSpawnSeconds) / intervalSeconds) +
      1,
  );
  const lastIndex = Math.floor(
    (currentElapsedSeconds - firstSpawnSeconds) / intervalSeconds,
  );

  if (lastIndex < firstIndex) {
    return [];
  }

  const spawns: EncounterSpawn[] = [];
  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const atSeconds = firstSpawnSeconds + index * intervalSeconds;
    if (atSeconds > previousElapsedSeconds && atSeconds <= currentElapsedSeconds) {
      spawns.push({
        kind,
        atSeconds,
        lane: lanes[index % lanes.length]!,
      });
    }
  }

  return spawns;
}

function compareSpawns(first: EncounterSpawn, second: EncounterSpawn): number {
  if (first.atSeconds !== second.atSeconds) {
    return first.atSeconds - second.atSeconds;
  }

  return first.kind === second.kind ? 0 : first.kind === 'rock' ? -1 : 1;
}

function isValidCircle(circle: Circle): boolean {
  return Number.isFinite(circle.x) &&
    Number.isFinite(circle.y) &&
    Number.isFinite(circle.radius) &&
    circle.radius >= 0;
}
