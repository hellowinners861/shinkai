/**
 * Phaser-independent rules for the V2 depth hazard waves and fuel recovery.
 *
 * The scene consumes the returned lane/timing data for rendering and
 * collision setup. This module has no clock, random state, Phaser, or mutable
 * scene objects, so a replay and a test receive the same wave order for the
 * same seed.
 */

export const HAZARD_LANES = [
  'leftOuter',
  'leftInner',
  'center',
  'rightInner',
  'rightOuter',
] as const;

export type HazardLane = (typeof HAZARD_LANES)[number];

export const RECOVERY_LANES = [
  'leftInner',
  'rightInner',
  'leftOuter',
  'rightOuter',
] as const;

export type RecoveryLane = (typeof RECOVERY_LANES)[number];
export const RECOVERY_LANE_CYCLE = RECOVERY_LANES;

export type HazardBand = 1 | 2 | 3 | 4;

/** The maximum difference between the first and last rock in one wave. */
export const MAX_HAZARD_STAGGER_SECONDS = 0.65;
export const MAX_WAVE_STAGGER_SECONDS = MAX_HAZARD_STAGGER_SECONDS;

/** Warning visibility starts at least this long before a wave reaches the player line. */
export const HAZARD_WARNING_LEAD_SECONDS = 2.5;
export const WARNING_LEAD_SECONDS = HAZARD_WARNING_LEAD_SECONDS;

export const RECOVERY_FIRST_SPAWN_SECONDS = 15;
export const RECOVERY_INTERVAL_SECONDS = 36;
export const MAX_RECOVERY_SHIFT_SECONDS = 2;
export const RECOVERY_SHIFT_STEP_SECONDS = 0.25;

/** Shared gameplay values used by the deterministic zero-input simulation. */
export const HAZARD_DIVE_SPEED_M_PER_SECOND = 25;
export const HAZARD_FUEL_CONSUMPTION_PER_SECOND = 0.18;
export const HAZARD_MAX_FUEL = 100;
export const HAZARD_ROCK_FUEL_DAMAGE = 10;
export const HAZARD_ROCK_INVULNERABILITY_SECONDS = 1;
export const HAZARD_TARGET_DEPTH_M = 6_000;

export interface DepthBandRule {
  readonly band: HazardBand;
  readonly minDepthM: number;
  readonly maxDepthM: number;
  readonly waveIntervalSeconds: number;
  readonly minRockCount: number;
  readonly maxRockCount: number;
  readonly minimumSafeLanes: number;
}

/** The four ranges and wave cadence from GAMEPLAY_LOOP_V2.md. */
export const HAZARD_DEPTH_BANDS: readonly DepthBandRule[] = Object.freeze([
  Object.freeze({
    band: 1 as const,
    minDepthM: 0,
    maxDepthM: 999,
    waveIntervalSeconds: 6,
    minRockCount: 1,
    maxRockCount: 1,
    minimumSafeLanes: 2,
  }),
  Object.freeze({
    band: 2 as const,
    minDepthM: 1_000,
    maxDepthM: 2_499,
    waveIntervalSeconds: 5.5,
    minRockCount: 1,
    maxRockCount: 2,
    minimumSafeLanes: 2,
  }),
  Object.freeze({
    band: 3 as const,
    minDepthM: 2_500,
    maxDepthM: 3_999,
    waveIntervalSeconds: 5,
    minRockCount: 2,
    maxRockCount: 3,
    minimumSafeLanes: 1,
  }),
  Object.freeze({
    band: 4 as const,
    minDepthM: 4_000,
    maxDepthM: 6_000,
    waveIntervalSeconds: 4.5,
    minRockCount: 3,
    maxRockCount: 3,
    minimumSafeLanes: 1,
  }),
]);

export const DEPTH_BAND_RULES = HAZARD_DEPTH_BANDS;
export const DEPTH_BANDS = HAZARD_DEPTH_BANDS;
export const HAZARD_WAVE_INTERVAL_SECONDS_BY_BAND: Readonly<
  Record<HazardBand, number>
> = Object.freeze({
  1: 6,
  2: 5.5,
  3: 5,
  4: 4.5,
});
export const ROCK_COUNT_BY_BAND: Readonly<
  Record<HazardBand, Readonly<{ min: number; max: number }>>
> = Object.freeze({
  1: Object.freeze({ min: 1, max: 1 }),
  2: Object.freeze({ min: 1, max: 2 }),
  3: Object.freeze({ min: 2, max: 3 }),
  4: Object.freeze({ min: 3, max: 3 }),
});

export interface HazardRockSpawn {
  readonly lane: HazardLane;
  /** Offset from the wave's `atSeconds`, always in the 0..0.65 range. */
  readonly staggerSeconds: number;
  /** Absolute event time, equal to `atSeconds + staggerSeconds`. */
  readonly atSeconds: number;
}

export interface HazardWave {
  readonly kind: 'hazard';
  /** Monotonic index across a generated schedule. */
  readonly waveIndex: number;
  /** Index within its depth band; used for deterministic center-block cadence. */
  readonly bandWaveIndex: number;
  readonly band: HazardBand;
  readonly atSeconds: number;
  readonly depthM: number;
  readonly rocks: readonly HazardRockSpawn[];
  readonly rockLanes: readonly HazardLane[];
  readonly rockCount: number;
  readonly safeLanes: readonly HazardLane[];
  readonly centerBlocked: boolean;
  /** Absolute time at which the warning may first be shown. */
  readonly warningAtSeconds: number;
  readonly warningLeadSeconds: number;
  readonly maxStaggerSeconds: number;
}

export interface HazardWaveOptions {
  readonly band: HazardBand | DepthBandRule;
  readonly waveIndex?: number;
  readonly bandWaveIndex?: number;
  readonly seed?: number;
  readonly atSeconds?: number;
  readonly depthM?: number;
  readonly previousSafeLanes?: readonly HazardLane[];
}

export interface HazardWaveScheduleOptions {
  readonly seed?: number;
  readonly startDepthM?: number;
  readonly endDepthM?: number;
  readonly startSeconds?: number;
  readonly endSeconds?: number;
  readonly waveCount?: number;
  readonly count?: number;
}

/** Returns the immutable rule for a band number. */
export function getDepthBandRule(band: HazardBand): DepthBandRule {
  return HAZARD_DEPTH_BANDS[band - 1] ?? HAZARD_DEPTH_BANDS[0]!;
}

/** Returns the depth band containing the supplied depth. */
export function getDepthBand(depthM: number): DepthBandRule {
  const depth = normalizeDepth(depthM);
  for (const rule of HAZARD_DEPTH_BANDS) {
    if (depth >= rule.minDepthM && depth <= rule.maxDepthM) {
      return rule;
    }
  }

  return depth < HAZARD_DEPTH_BANDS[0]!.minDepthM
    ? HAZARD_DEPTH_BANDS[0]!
    : HAZARD_DEPTH_BANDS[HAZARD_DEPTH_BANDS.length - 1]!;
}

export function getDepthBandNumber(depthM: number): HazardBand {
  return getDepthBand(depthM).band;
}

export const getHazardDepthBand = getDepthBand;
export const getHazardDepthBandNumber = getDepthBandNumber;

export function getWaveIntervalSeconds(band: HazardBand): number {
  return getDepthBandRule(band).waveIntervalSeconds;
}

export const getHazardWaveIntervalSeconds = getWaveIntervalSeconds;

export function getRockCountRange(
  band: HazardBand,
): Readonly<{ min: number; max: number }> {
  return ROCK_COUNT_BY_BAND[band];
}

/** Creates one deterministic wave. */
export function generateHazardWave(options: HazardWaveOptions): HazardWave;
export function generateHazardWave(
  band: HazardBand,
  bandWaveIndex?: number,
  seed?: number,
  atSeconds?: number,
  depthM?: number,
): HazardWave;
export function generateHazardWave(
  optionsOrBand: HazardWaveOptions | HazardBand,
  positionalBandWaveIndex = 0,
  positionalSeed = 0,
  positionalAtSeconds?: number,
  positionalDepthM?: number,
): HazardWave {
  const options: HazardWaveOptions = typeof optionsOrBand === 'number'
    ? {
        band: optionsOrBand,
        bandWaveIndex: positionalBandWaveIndex,
        waveIndex: positionalBandWaveIndex,
        seed: positionalSeed,
        atSeconds: positionalAtSeconds,
        depthM: positionalDepthM,
      }
    : optionsOrBand;
  const band = normalizeBand(options.band);
  const rule = getDepthBandRule(band);
  const bandWaveIndex = normalizeNonNegativeInteger(
    options.bandWaveIndex ?? options.waveIndex ?? 0,
  );
  const waveIndex = normalizeNonNegativeInteger(options.waveIndex ?? bandWaveIndex);
  const seed = normalizeSeed(options.seed);
  const atSeconds = normalizeTime(
    options.atSeconds ?? (bandWaveIndex + 1) * rule.waveIntervalSeconds,
  );
  const depthM = Number.isFinite(options.depthM)
    ? Math.max(0, options.depthM ?? 0)
    : rule.minDepthM;
  const centerBlocked = shouldBlockCenter(band, bandWaveIndex);
  let rockCount = chooseRockCount(rule, bandWaveIndex, seed);

  // A band transition can begin with another center-block wave. In the only
  // degenerate case where the previous wave left all four non-center lanes
  // open, use the allowed upper count so that the route visibly changes.
  if (
    centerBlocked &&
    options.previousSafeLanes !== undefined &&
    options.previousSafeLanes.length === HAZARD_LANES.length - 1 &&
    !options.previousSafeLanes.includes('center') &&
    rule.maxRockCount > rockCount
  ) {
    rockCount = rule.maxRockCount;
  }

  const safeLanes = chooseSafeLanes(
    rule,
    bandWaveIndex,
    seed,
    centerBlocked,
    options.previousSafeLanes,
    rockCount,
  );
  const rocks = createRockSpawns(safeLanes, atSeconds, bandWaveIndex, seed);
  const rockLanes = rocks.map((rock) => rock.lane);

  return Object.freeze({
    kind: 'hazard' as const,
    waveIndex,
    bandWaveIndex,
    band,
    atSeconds,
    depthM,
    rocks: Object.freeze(rocks),
    rockLanes: Object.freeze(rockLanes),
    rockCount: rocks.length,
    safeLanes: Object.freeze([...safeLanes]),
    centerBlocked: !safeLanes.includes('center'),
    warningAtSeconds: atSeconds - HAZARD_WARNING_LEAD_SECONDS,
    warningLeadSeconds: HAZARD_WARNING_LEAD_SECONDS,
    maxStaggerSeconds: rocks.length > 1
      ? rocks[rocks.length - 1]!.staggerSeconds - rocks[0]!.staggerSeconds
      : 0,
  });
}

export const createHazardWave = generateHazardWave;

/** Generates a deterministic sequence whose first wave is one interval in. */
export function generateHazardWaveSequence(
  band: HazardBand,
  count: number,
  options: Omit<HazardWaveOptions, 'band' | 'waveIndex' | 'bandWaveIndex'> = {},
): HazardWave[] {
  const rule = getDepthBandRule(band);
  const waveCount = normalizeNonNegativeInteger(count);
  const waves: HazardWave[] = [];
  let previousSafeLanes: readonly HazardLane[] | undefined;

  for (let index = 0; index < waveCount; index += 1) {
    const wave = generateHazardWave({
      ...options,
      band,
      waveIndex: index,
      bandWaveIndex: index,
      atSeconds: options.atSeconds === undefined
        ? (index + 1) * rule.waveIntervalSeconds
        : options.atSeconds + index * rule.waveIntervalSeconds,
      previousSafeLanes,
    });
    waves.push(wave);
    previousSafeLanes = wave.safeLanes;
  }

  return waves;
}

export const generateHazardWavesForBand = generateHazardWaveSequence;

/**
 * Generates all waves for a depth interval. Band boundaries are scheduled
 * independently, so intervals inside each band remain exactly the documented
 * interval even when the interval changes at a boundary.
 */
export function generateHazardWaves(options?: HazardWaveScheduleOptions): HazardWave[];
export function generateHazardWaves(
  startDepthM: number,
  endDepthM: number,
  seed?: number,
): HazardWave[];
export function generateHazardWaves(
  optionsOrStartDepth: HazardWaveScheduleOptions | number = {},
  positionalEndDepth?: number,
  positionalSeed = 0,
): HazardWave[] {
  const options: HazardWaveScheduleOptions = typeof optionsOrStartDepth === 'number'
    ? {
        startDepthM: optionsOrStartDepth,
        endDepthM: positionalEndDepth,
        seed: positionalSeed,
      }
    : optionsOrStartDepth;
  const startDepth = normalizeDepth(options.startDepthM ?? 0);
  const endDepth = Math.max(
    startDepth,
    normalizeDepth(options.endDepthM ?? HAZARD_TARGET_DEPTH_M),
  );
  const startSeconds = normalizeTime(
    options.startSeconds ?? startDepth / HAZARD_DIVE_SPEED_M_PER_SECOND,
  );
  const defaultEndSeconds = startSeconds +
    (endDepth - startDepth) / HAZARD_DIVE_SPEED_M_PER_SECOND;
  const endSeconds = Math.max(
    startSeconds,
    normalizeTime(options.endSeconds ?? defaultEndSeconds),
  );
  const seed = normalizeSeed(options.seed);
  const requestedCount = normalizeOptionalCount(options.waveCount ?? options.count);
  const waves: HazardWave[] = [];
  let waveIndex = 0;
  let previousSafeLanes: readonly HazardLane[] | undefined;

  for (const rule of HAZARD_DEPTH_BANDS) {
    const rangeStartDepth = Math.max(startDepth, rule.minDepthM);
    const rangeEndDepth = Math.min(endDepth, rule.maxDepthM);
    if (rangeEndDepth < rangeStartDepth) {
      continue;
    }

    const rangeStartSeconds = startSeconds +
      (rangeStartDepth - startDepth) / HAZARD_DIVE_SPEED_M_PER_SECOND;
    const rangeEndSeconds = Math.min(
      endSeconds,
      startSeconds + (rangeEndDepth - startDepth) /
        HAZARD_DIVE_SPEED_M_PER_SECOND,
    );
    const firstWaveSeconds = rangeStartSeconds + rule.waveIntervalSeconds;
    let bandWaveIndex = 0;

    for (
      let atSeconds = firstWaveSeconds;
      atSeconds <= rangeEndSeconds + 1e-9;
      atSeconds += rule.waveIntervalSeconds
    ) {
      if (requestedCount !== undefined && waves.length >= requestedCount) {
        return waves;
      }

      const depthM = startDepth +
        (atSeconds - startSeconds) * HAZARD_DIVE_SPEED_M_PER_SECOND;
      const wave = generateHazardWave({
        band: rule.band,
        waveIndex,
        bandWaveIndex,
        seed,
        atSeconds,
        depthM,
        previousSafeLanes,
      });
      waves.push(wave);
      previousSafeLanes = wave.safeLanes;
      waveIndex += 1;
      bandWaveIndex += 1;
    }
  }

  return waves;
}

export const generateHazardWaveSchedule = generateHazardWaves;

export function isHazardWarningVisible(
  wave: HazardWave,
  elapsedSeconds: number,
): boolean {
  if (!Number.isFinite(elapsedSeconds)) {
    return false;
  }

  return elapsedSeconds >= wave.warningAtSeconds &&
    elapsedSeconds < wave.atSeconds;
}

export function getHazardWarningAtSeconds(wave: HazardWave): number {
  return wave.warningAtSeconds;
}

export function isHazardWavePassable(wave: HazardWave): boolean {
  return wave.safeLanes.length > 0;
}

export const hasSafeLane = isHazardWavePassable;

export interface HazardWaveValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/** Validates the invariants that are independent of Phaser geometry. */
export function validateHazardWave(wave: HazardWave): HazardWaveValidation {
  const errors: string[] = [];
  const rule = getDepthBandRule(wave.band);
  const uniqueRockLanes = new Set(wave.rockLanes);
  const uniqueSafeLanes = new Set(wave.safeLanes);
  const overlap = wave.rockLanes.some((lane) => uniqueSafeLanes.has(lane));
  const maxStagger = wave.rocks.length > 0
    ? Math.max(...wave.rocks.map((rock) => rock.staggerSeconds)) -
      Math.min(...wave.rocks.map((rock) => rock.staggerSeconds))
    : 0;

  if (wave.rockCount < rule.minRockCount || wave.rockCount > rule.maxRockCount) {
    errors.push('rock count is outside the depth-band range');
  }
  if (uniqueRockLanes.size !== wave.rockLanes.length) {
    errors.push('a wave contains duplicate rock lanes');
  }
  if (uniqueSafeLanes.size !== wave.safeLanes.length || overlap) {
    errors.push('rock and safe lanes overlap');
  }
  if (wave.safeLanes.length < rule.minimumSafeLanes) {
    errors.push('a wave does not leave enough safe lanes');
  }
  if (wave.centerBlocked !== !uniqueSafeLanes.has('center')) {
    errors.push('centerBlocked does not match the center lane');
  }
  if (maxStagger > MAX_HAZARD_STAGGER_SECONDS + 1e-9) {
    errors.push('wave stagger exceeds the 0.65 second limit');
  }
  if (wave.atSeconds - wave.warningAtSeconds < HAZARD_WARNING_LEAD_SECONDS - 1e-9) {
    errors.push('hazard warning is shown too late');
  }

  return { valid: errors.length === 0, errors: Object.freeze(errors) };
}

export interface RecoverySpawn {
  readonly kind: 'recovery';
  readonly sequence: number;
  readonly lane: RecoveryLane;
  readonly nominalAtSeconds: number;
  readonly atSeconds: number;
  readonly shiftSeconds: number;
}

export interface RecoverySpawnAttempt {
  readonly sequence: number;
  readonly lane: RecoveryLane;
  readonly nominalAtSeconds: number;
  readonly status: 'scheduled' | 'skipped';
  readonly spawn?: RecoverySpawn;
}

export interface RecoveryScheduleOptions {
  readonly startSeconds?: number;
  readonly endSeconds?: number;
  readonly firstSpawnSeconds?: number;
  readonly intervalSeconds?: number;
  readonly hazardWaves?: readonly HazardWave[];
  readonly waves?: readonly HazardWave[];
}

export interface RecoveryScheduleResult {
  readonly spawns: readonly RecoverySpawn[];
  readonly skipped: readonly RecoverySpawnAttempt[];
}

export function getRecoveryLane(sequence: number): RecoveryLane {
  const index = normalizeNonNegativeInteger(sequence) % RECOVERY_LANES.length;
  return RECOVERY_LANES[index]!;
}

export function getNominalRecoverySpawn(
  sequence: number,
  firstSpawnSeconds = RECOVERY_FIRST_SPAWN_SECONDS,
  intervalSeconds = RECOVERY_INTERVAL_SECONDS,
): Pick<RecoverySpawn, 'sequence' | 'lane' | 'nominalAtSeconds'> {
  const safeSequence = normalizeNonNegativeInteger(sequence);
  const first = normalizeTime(firstSpawnSeconds);
  const interval = Number.isFinite(intervalSeconds) && intervalSeconds > 0
    ? intervalSeconds
    : RECOVERY_INTERVAL_SECONDS;
  return {
    sequence: safeSequence,
    lane: getRecoveryLane(safeSequence),
    nominalAtSeconds: first + safeSequence * interval,
  };
}

export const getRecoverySpawnLane = getRecoveryLane;

/** Returns true if a recovery capsule would be unsafe at a time. */
export function isRecoveryLaneBlockedAtTime(
  lane: RecoveryLane,
  atSeconds: number,
  hazardWaves: readonly HazardWave[],
): boolean {
  if (!Number.isFinite(atSeconds)) {
    return true;
  }

  return hazardWaves.some((wave) => {
    const waveEndSeconds = getWaveEndSeconds(wave);
    if (
      atSeconds < wave.atSeconds - 1e-9 ||
      atSeconds > waveEndSeconds + 1e-9
    ) {
      return false;
    }
    if (wave.safeLanes.includes(lane)) {
      return false;
    }
    return wave.rocks.some((rock) => rock.lane === lane);
  });
}

export const isRecoveryPlacementBlocked = isRecoveryLaneBlockedAtTime;

/**
 * Resolves a recovery event. A blocked event moves forward in deterministic
 * 0.25-second steps, at most two seconds, and is skipped when no safe slot is
 * available in that window.
 */
export function resolveRecoverySpawn(
  sequence: number,
  nominalAtSeconds: number,
  lane: RecoveryLane,
  hazardWaves: readonly HazardWave[] = [],
): RecoverySpawn | undefined {
  const safeNominal = normalizeTime(nominalAtSeconds);
  const safeSequence = normalizeNonNegativeInteger(sequence);
  for (
    let shiftSeconds = 0;
    shiftSeconds <= MAX_RECOVERY_SHIFT_SECONDS + 1e-9;
    shiftSeconds += RECOVERY_SHIFT_STEP_SECONDS
  ) {
    const atSeconds = safeNominal + shiftSeconds;
    if (!isRecoveryLaneBlockedAtTime(lane, atSeconds, hazardWaves)) {
      return Object.freeze({
        kind: 'recovery' as const,
        sequence: safeSequence,
        lane,
        nominalAtSeconds: safeNominal,
        atSeconds,
        shiftSeconds,
      });
    }
  }

  return undefined;
}

export function scheduleRecoverySpawns(
  options: RecoveryScheduleOptions = {},
): RecoveryScheduleResult {
  const startSeconds = normalizeTime(options.startSeconds ?? 0);
  const endSeconds = Math.max(
    startSeconds,
    normalizeTime(options.endSeconds ??
      HAZARD_TARGET_DEPTH_M / HAZARD_DIVE_SPEED_M_PER_SECOND),
  );
  const firstSpawnSeconds = normalizeTime(
    options.firstSpawnSeconds ?? RECOVERY_FIRST_SPAWN_SECONDS,
  );
  const intervalSeconds = Number.isFinite(options.intervalSeconds) &&
    (options.intervalSeconds ?? 0) > 0
    ? options.intervalSeconds!
    : RECOVERY_INTERVAL_SECONDS;
  const hazardWaves = options.hazardWaves ?? options.waves ?? [];
  const firstSequence = Math.max(
    0,
    Math.ceil((startSeconds - firstSpawnSeconds) / intervalSeconds),
  );
  const lastSequence = Math.floor(
    (endSeconds - firstSpawnSeconds) / intervalSeconds,
  );
  const spawns: RecoverySpawn[] = [];
  const skipped: RecoverySpawnAttempt[] = [];

  for (let sequence = firstSequence; sequence <= lastSequence; sequence += 1) {
    const nominal = getNominalRecoverySpawn(
      sequence,
      firstSpawnSeconds,
      intervalSeconds,
    );
    const spawn = resolveRecoverySpawn(
      nominal.sequence,
      nominal.nominalAtSeconds,
      nominal.lane,
      hazardWaves,
    );
    if (spawn === undefined || spawn.atSeconds > endSeconds + 1e-9) {
      skipped.push(Object.freeze({
        ...nominal,
        status: 'skipped' as const,
      }));
      continue;
    }
    spawns.push(spawn);
  }

  return {
    spawns: Object.freeze(spawns),
    skipped: Object.freeze(skipped),
  };
}

export function generateRecoverySpawns(
  options: RecoveryScheduleOptions = {},
): RecoverySpawn[] {
  return [...scheduleRecoverySpawns(options).spawns];
}

export const getRecoverySpawns = generateRecoverySpawns;
export const getRecoverySchedule = generateRecoverySpawns;

/** Boundary-based helper matching the existing encounter schedule API. */
export function getDueRecoverySpawns(
  previousElapsedSeconds: number,
  currentElapsedSeconds: number,
  hazardWaves: readonly HazardWave[] = [],
): RecoverySpawn[] {
  if (
    !Number.isFinite(previousElapsedSeconds) ||
    !Number.isFinite(currentElapsedSeconds) ||
    currentElapsedSeconds <= previousElapsedSeconds
  ) {
    return [];
  }

  return generateRecoverySpawns({
    startSeconds: previousElapsedSeconds,
    endSeconds: currentElapsedSeconds,
    hazardWaves,
  }).filter((spawn) => spawn.atSeconds > previousElapsedSeconds &&
    spawn.atSeconds <= currentElapsedSeconds + 1e-9);
}

export interface StationaryCenterSimulationOptions {
  readonly initialFuel?: number;
  readonly startDepthM?: number;
  readonly targetDepthM?: number;
  readonly startSeconds?: number;
  readonly descentSpeedMPerSecond?: number;
  readonly fuelConsumptionPerSecond?: number;
  readonly rockDamage?: number;
  readonly invulnerabilitySeconds?: number;
  readonly hazardWaves?: readonly HazardWave[];
  readonly seed?: number;
}

export interface StationaryCenterSimulationResult {
  readonly status: 'cleared' | 'depleted';
  readonly reachedDepthM: number;
  readonly remainingFuel: number;
  readonly elapsedSeconds: number;
  readonly collisionCount: number;
  readonly collisionTimesSeconds: readonly number[];
}

/** Runs the documented no-input/center-lane challenge without a game scene. */
export function simulateStationaryCenter(
  options: StationaryCenterSimulationOptions = {},
): StationaryCenterSimulationResult {
  const initialFuel = clamp(
    normalizeFinite(options.initialFuel ?? HAZARD_MAX_FUEL),
    0,
    HAZARD_MAX_FUEL,
  );
  const startDepthM = normalizeDepth(options.startDepthM ?? 0);
  const targetDepthM = Math.max(
    startDepthM,
    normalizeDepth(options.targetDepthM ?? HAZARD_TARGET_DEPTH_M),
  );
  const startSeconds = normalizeTime(options.startSeconds ??
    startDepthM / HAZARD_DIVE_SPEED_M_PER_SECOND);
  const descentSpeed = positiveOr(
    options.descentSpeedMPerSecond,
    HAZARD_DIVE_SPEED_M_PER_SECOND,
  );
  const fuelConsumption = Math.max(
    0,
    normalizeFinite(options.fuelConsumptionPerSecond ??
      HAZARD_FUEL_CONSUMPTION_PER_SECOND),
  );
  const rockDamage = Math.max(
    0,
    normalizeFinite(options.rockDamage ?? HAZARD_ROCK_FUEL_DAMAGE),
  );
  const invulnerabilitySeconds = Math.max(
    0,
    normalizeFinite(options.invulnerabilitySeconds ??
      HAZARD_ROCK_INVULNERABILITY_SECONDS),
  );
  const endSeconds = startSeconds + (targetDepthM - startDepthM) / descentSpeed;
  const waves = options.hazardWaves ?? generateHazardWaves({
    seed: options.seed,
    startDepthM,
    endDepthM: targetDepthM,
    startSeconds,
    endSeconds,
  });
  const centerEvents = waves
    .flatMap((wave) => wave.rocks
      .filter((rock) => rock.lane === 'center')
      .map((rock) => rock.atSeconds))
    .filter((atSeconds) => atSeconds >= startSeconds && atSeconds <= endSeconds)
    .sort((first, second) => first - second);

  if (initialFuel <= 0) {
    return Object.freeze({
      status: 'depleted' as const,
      reachedDepthM: startDepthM,
      remainingFuel: 0,
      elapsedSeconds: startSeconds,
      collisionCount: 0,
      collisionTimesSeconds: Object.freeze([]),
    });
  }

  let fuel = initialFuel;
  let elapsedSeconds = startSeconds;
  let invulnerabilityRemaining = 0;
  const collisionTimesSeconds: number[] = [];

  for (const eventSeconds of centerEvents) {
    if (eventSeconds < elapsedSeconds) {
      continue;
    }

    fuel -= fuelConsumption * (eventSeconds - elapsedSeconds);
    invulnerabilityRemaining = Math.max(
      0,
      invulnerabilityRemaining - (eventSeconds - elapsedSeconds),
    );
    elapsedSeconds = eventSeconds;
    if (fuel <= 0) {
      return createStationaryResult(
        'depleted',
        startDepthM,
        targetDepthM,
        startSeconds,
        descentSpeed,
        elapsedSeconds,
        fuel,
        collisionTimesSeconds,
      );
    }

    if (invulnerabilityRemaining <= 0 && rockDamage > 0) {
      fuel -= rockDamage;
      collisionTimesSeconds.push(eventSeconds);
      invulnerabilityRemaining = invulnerabilitySeconds;
      if (fuel <= 0) {
        return createStationaryResult(
          'depleted',
          startDepthM,
          targetDepthM,
          startSeconds,
          descentSpeed,
          elapsedSeconds,
          fuel,
          collisionTimesSeconds,
        );
      }
    }
  }

  fuel -= fuelConsumption * (endSeconds - elapsedSeconds);
  if (fuel <= 0) {
    return createStationaryResult(
      'depleted',
      startDepthM,
      targetDepthM,
      startSeconds,
      descentSpeed,
      endSeconds,
      fuel,
      collisionTimesSeconds,
    );
  }

  return createStationaryResult(
    'cleared',
    startDepthM,
    targetDepthM,
    startSeconds,
    descentSpeed,
    endSeconds,
    fuel,
    collisionTimesSeconds,
  );
}

export const simulateZeroInputCenter = simulateStationaryCenter;
export const simulateStationaryCenterline = simulateStationaryCenter;

function createStationaryResult(
  status: 'cleared' | 'depleted',
  startDepthM: number,
  targetDepthM: number,
  startSeconds: number,
  descentSpeed: number,
  elapsedSeconds: number,
  fuel: number,
  collisionTimesSeconds: readonly number[],
): StationaryCenterSimulationResult {
  const depthM = clamp(
    startDepthM + (elapsedSeconds - startSeconds) * descentSpeed,
    startDepthM,
    targetDepthM,
  );
  return Object.freeze({
    status,
    reachedDepthM: depthM,
    remainingFuel: Math.max(0, fuel),
    elapsedSeconds,
    collisionCount: collisionTimesSeconds.length,
    collisionTimesSeconds: Object.freeze([...collisionTimesSeconds]),
  });
}

function chooseRockCount(
  rule: DepthBandRule,
  bandWaveIndex: number,
  seed: number,
): number {
  const span = rule.maxRockCount - rule.minRockCount + 1;
  if (span <= 1) {
    return rule.minRockCount;
  }
  return rule.minRockCount + hash32(seed, rule.band, bandWaveIndex, 11) % span;
}

/** Center blocks recur every two later waves and every three early waves. */
function shouldBlockCenter(band: HazardBand, bandWaveIndex: number): boolean {
  const cadence: Record<HazardBand, number> = {
    1: 3,
    2: 3,
    3: 2,
    4: 2,
  };
  const period = cadence[band];
  return bandWaveIndex % period === 0;
}

function chooseSafeLanes(
  rule: DepthBandRule,
  bandWaveIndex: number,
  seed: number,
  centerBlocked: boolean,
  previousSafeLanes: readonly HazardLane[] | undefined,
  rockCount: number,
): HazardLane[] {
  const safeCount = HAZARD_LANES.length - rockCount;
  const eligibleLanes = HAZARD_LANES.filter((lane) =>
    !centerBlocked || lane !== 'center',
  );
  const rotation = hash32(seed, rule.band, bandWaveIndex, 23) %
    eligibleLanes.length;

  for (let attempt = 0; attempt < eligibleLanes.length; attempt += 1) {
    const ordered = rotate(eligibleLanes, rotation + attempt);
    let candidate = ordered.slice(0, safeCount);
    if (!centerBlocked && !candidate.includes('center')) {
      candidate = [...candidate.slice(0, Math.max(0, safeCount - 1)), 'center'];
    }
    candidate = sortByLaneOrder(candidate);
    if (
      previousSafeLanes === undefined ||
      !sameLaneSet(candidate, previousSafeLanes)
    ) {
      return candidate;
    }
  }

  return sortByLaneOrder(
    (centerBlocked ? eligibleLanes : HAZARD_LANES).slice(0, safeCount),
  );
}

function createRockSpawns(
  safeLanes: readonly HazardLane[],
  atSeconds: number,
  bandWaveIndex: number,
  seed: number,
): HazardRockSpawn[] {
  const rocks = HAZARD_LANES.filter((lane) => !safeLanes.includes(lane));
  const ordered = rotate(
    rocks,
    hash32(seed, bandWaveIndex, rocks.length, 31) % Math.max(1, rocks.length),
  );
  return ordered.map((lane, index) => {
    const staggerSeconds = ordered.length <= 1
      ? 0
      : (index / (ordered.length - 1)) * MAX_HAZARD_STAGGER_SECONDS;
    return Object.freeze({
      lane,
      staggerSeconds,
      atSeconds: atSeconds + staggerSeconds,
    });
  });
}

function getWaveEndSeconds(wave: HazardWave): number {
  return wave.rocks.length === 0
    ? wave.atSeconds
    : Math.max(...wave.rocks.map((rock) => rock.atSeconds));
}

function sameLaneSet(
  first: readonly HazardLane[],
  second: readonly HazardLane[],
): boolean {
  return first.length === second.length &&
    first.every((lane) => second.includes(lane));
}

function sortByLaneOrder(lanes: readonly HazardLane[]): HazardLane[] {
  return [...lanes].sort(
    (first, second) => HAZARD_LANES.indexOf(first) - HAZARD_LANES.indexOf(second),
  );
}

function rotate<T>(values: readonly T[], offset: number): T[] {
  if (values.length === 0) {
    return [];
  }
  const normalizedOffset = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(normalizedOffset), ...values.slice(0, normalizedOffset)];
}

function hash32(seed: number, first: number, second: number, salt: number): number {
  let hash = 2_166_136_261 ^ (normalizeSeed(seed) >>> 0);
  hash = Math.imul(hash ^ first, 16_777_619);
  hash = Math.imul(hash ^ second, 16_777_619);
  hash = Math.imul(hash ^ salt, 16_777_619);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 1_664_525) + 1_013_904_223;
  return hash >>> 0;
}

function normalizeBand(value: HazardBand | DepthBandRule): HazardBand {
  const band = typeof value === 'number' ? value : value.band;
  if (band === 1 || band === 2 || band === 3 || band === 4) {
    return band;
  }
  return 1;
}

function normalizeDepth(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeTime(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeSeed(value: number | undefined): number {
  return Number.isFinite(value) ? Math.trunc(value ?? 0) : 0;
}

function normalizeNonNegativeInteger(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function normalizeOptionalCount(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function positiveOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value! : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
