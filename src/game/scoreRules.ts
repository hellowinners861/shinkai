/** The five catalog base scores used by the V2 scoring rules. */
export const BASE_SCORE_VALUES = Object.freeze([
  10,
  25,
  50,
  75,
  100,
] as const);

/** Alias kept close to the terminology used by the design document. */
export const SCORE_BASE_VALUES = BASE_SCORE_VALUES;

export type BaseScore = (typeof BASE_SCORE_VALUES)[number];

export const SCORE_MULTIPLIER_STEP = 0.25;
export const MIN_SCORE_MULTIPLIER = 1;
export const MAX_SCORE_MULTIPLIER = 2;
export const MAX_CLEAN_STREAK_FOR_MULTIPLIER = 5;
export const MAX_DEPTH_BONUS = 600;
export const MAX_FUEL_BONUS = 1_000;

/**
 * A running total for one dive.  The state is deliberately independent of
 * Phaser so that a scene can keep it in its own lifecycle without making the
 * scoring rules stateful.
 */
export interface ScoreState {
  readonly cleanStreak: number;
  readonly scanScoreTotal: number;
  readonly firstDiscoveryBonusTotal: number;
}

/** The score earned by one completed scan and the resulting running state. */
export interface ScanCompletionScore {
  readonly cleanStreak: number;
  readonly multiplier: number;
  readonly scanScore: number;
  readonly firstDiscoveryBonus: number;
  readonly state: ScoreState;
}

/** Inputs accepted by the result-screen score breakdown. */
export interface ScoreBreakdownInput {
  /** Scan score accumulated during the dive. */
  readonly scanScore?: number;
  readonly scanScoreTotal?: number;
  /** Bonus accumulated for species that were new before this dive. */
  readonly firstDiscoveryBonus?: number;
  readonly firstDiscoveryBonusTotal?: number;
  readonly newSpeciesBonus?: number;
  readonly newSpeciesScore?: number;
  readonly newSpecies?: number;
  /** Pass either raw depth/fuel values or already computed bonuses. */
  readonly reachedDepthM?: number;
  readonly depthM?: number;
  readonly depth?: number;
  readonly depthBonus?: number;
  readonly remainingFuel?: number;
  readonly fuel?: number;
  readonly fuelBonus?: number;
}

/** The four result-screen rows and their normalized sum. */
export interface ScoreBreakdown {
  readonly scanScore: number;
  readonly firstDiscoveryBonus: number;
  readonly depthBonus: number;
  readonly fuelBonus: number;
  readonly finalScore: number;
}

/** Converts an untrusted number to a non-negative integer. */
export function normalizeNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}

/**
 * Catalog scores are constrained to the documented five values.  A malformed
 * or out-of-catalog score contributes zero rather than leaking a NaN or a
 * negative value into a result.
 */
export function normalizeBaseScore(value: unknown): number {
  const normalized = normalizeNonNegativeInteger(value);
  return isBaseScore(normalized) ? normalized : 0;
}

/** Returns a fresh zeroed score state for a new dive. */
export function createInitialScoreState(): ScoreState {
  return {
    cleanStreak: 0,
    scanScoreTotal: 0,
    firstDiscoveryBonusTotal: 0,
  };
}

/** Alias matching the shorter naming used by scene state factories. */
export const createScoreState = createInitialScoreState;

/** Normalizes a score state without mutating the caller's object. */
export function normalizeScoreState(state: Partial<ScoreState> | undefined): ScoreState {
  return {
    cleanStreak: normalizeStreak(state?.cleanStreak),
    scanScoreTotal: normalizeNonNegativeInteger(state?.scanScoreTotal),
    firstDiscoveryBonusTotal: normalizeNonNegativeInteger(
      state?.firstDiscoveryBonusTotal,
    ),
  };
}

/**
 * Returns the multiplier for a completed scan.  Streak zero and streak one
 * both use 1×; every subsequent clean completion adds 0.25×, up to 2×.
 */
export function getScoreMultiplier(cleanStreak: number): number {
  const streak = normalizeStreak(cleanStreak);
  const steps = Math.min(
    Math.max(streak - 1, 0),
    MAX_CLEAN_STREAK_FOR_MULTIPLIER - 1,
  );
  return MIN_SCORE_MULTIPLIER + steps * SCORE_MULTIPLIER_STEP;
}

/** Aliases for callers that refer to the same rule as a streak multiplier. */
export const getStreakMultiplier = getScoreMultiplier;
export const calculateScoreMultiplier = getScoreMultiplier;
export const calculateStreakMultiplier = getScoreMultiplier;

/** Returns a normalized base score multiplied by the clean-scan streak. */
export function calculateScanScore(
  baseScore: number,
  cleanStreak: number,
): number {
  return normalizeNonNegativeInteger(
    Math.round(normalizeBaseScore(baseScore) * getScoreMultiplier(cleanStreak)),
  );
}

/** The first-discovery bonus is the base score and never receives a multiplier. */
export function calculateFirstDiscoveryBonus(baseScore: number): number {
  return normalizeBaseScore(baseScore);
}

/** Alias matching the result-screen label. */
export const calculateNewSpeciesBonus = calculateFirstDiscoveryBonus;

/** Increments a clean streak after one successful scan completion. */
export function incrementCleanStreak(cleanStreak: number): number {
  const current = normalizeStreak(cleanStreak);
  return current < Number.MAX_SAFE_INTEGER ? current + 1 : current;
}

/** Returns zero after a rock collision while preserving no other state. */
export function resetCleanStreak(cleanStreak: number): number;
export function resetCleanStreak(state: ScoreState): ScoreState;
export function resetCleanStreak(
  value: number | ScoreState,
): number | ScoreState {
  if (typeof value === "number") {
    return 0;
  }

  return {
    ...normalizeScoreState(value),
    cleanStreak: 0,
  };
}

/** Alias used by collision handlers. */
export const resetStreakOnRock = resetCleanStreak;
export const handleRockCollision = resetCleanStreak;

/**
 * Records one completed scan.  The streak is incremented before the multiplier
 * is evaluated, so the first completion is 1× and the fifth is 2×.
 */
export function completeScan(
  state: ScoreState,
  baseScore: number,
  isFirstDiscovery = false,
): ScanCompletionScore {
  const current = normalizeScoreState(state);
  const cleanStreak = incrementCleanStreak(current.cleanStreak);
  const multiplier = getScoreMultiplier(cleanStreak);
  const scanScore = calculateScanScore(baseScore, cleanStreak);
  const firstDiscoveryBonus = isFirstDiscovery
    ? calculateFirstDiscoveryBonus(baseScore)
    : 0;
  const nextState: ScoreState = {
    cleanStreak,
    scanScoreTotal: normalizeNonNegativeInteger(
      current.scanScoreTotal + scanScore,
    ),
    firstDiscoveryBonusTotal: normalizeNonNegativeInteger(
      current.firstDiscoveryBonusTotal + firstDiscoveryBonus,
    ),
  };

  return {
    cleanStreak,
    multiplier,
    scanScore,
    firstDiscoveryBonus,
    state: nextState,
  };
}

/** Alias matching the event terminology in the design document. */
export const recordScanCompletion = completeScan;
export const scoreScanCompletion = completeScan;

/** Resets only the clean streak after rock damage. */
export function applyRockDamage(state: ScoreState): ScoreState {
  return resetCleanStreak(state);
}

/** Returns floor(depth / 10), clamped to the documented 600-point maximum. */
export function calculateDepthBonus(reachedDepthM: number): number {
  if (typeof reachedDepthM !== "number" || !Number.isFinite(reachedDepthM)) {
    return 0;
  }

  return Math.min(
    MAX_DEPTH_BONUS,
    normalizeNonNegativeInteger(Math.floor(Math.max(0, reachedDepthM) / 10)),
  );
}

/** Returns floor(fuel × 10), clamped to the documented 1,000-point maximum. */
export function calculateFuelBonus(remainingFuel: number): number {
  if (typeof remainingFuel !== "number" || !Number.isFinite(remainingFuel)) {
    return 0;
  }

  const clampedFuel = Math.min(Math.max(remainingFuel, 0), 100);
  return Math.min(
    MAX_FUEL_BONUS,
    normalizeNonNegativeInteger(Math.floor(clampedFuel * 10)),
  );
}

/** Computes all result rows from accumulated scan values and raw depth/fuel. */
export function calculateScoreBreakdown(input: ScoreBreakdownInput): ScoreBreakdown {
  const scanScore = normalizeNonNegativeInteger(
    input.scanScoreTotal ?? input.scanScore,
  );
  const firstDiscoveryBonus = normalizeNonNegativeInteger(
    input.firstDiscoveryBonusTotal ??
      input.firstDiscoveryBonus ??
      input.newSpeciesBonus ??
      input.newSpeciesScore ??
      input.newSpecies,
  );
  const depthBonus = hasFiniteNumber(input.depthBonus)
    ? normalizeNonNegativeInteger(input.depthBonus)
    : calculateDepthBonus(
      input.reachedDepthM ?? input.depthM ?? input.depth ?? 0,
    );
  const fuelBonus = hasFiniteNumber(input.fuelBonus)
    ? normalizeNonNegativeInteger(input.fuelBonus)
    : calculateFuelBonus(input.remainingFuel ?? input.fuel ?? 0);
  const finalScore = normalizeNonNegativeInteger(
    scanScore + firstDiscoveryBonus + depthBonus + fuelBonus,
  );

  return {
    scanScore,
    firstDiscoveryBonus,
    depthBonus,
    fuelBonus,
    finalScore,
  };
}

/**
 * Computes final score from either a breakdown input or positional values
 * `(scanScore, firstDiscoveryBonus, reachedDepthM, remainingFuel)`.
 */
export function calculateFinalScore(input: ScoreBreakdownInput): number;
export function calculateFinalScore(
  scanScore: number,
  firstDiscoveryBonus: number,
  reachedDepthM: number,
  remainingFuel: number,
): number;
export function calculateFinalScore(
  inputOrScanScore: ScoreBreakdownInput | number,
  firstDiscoveryBonus = 0,
  reachedDepthM = 0,
  remainingFuel = 0,
): number {
  if (typeof inputOrScanScore === "number") {
    return calculateScoreBreakdown({
      scanScore: inputOrScanScore,
      firstDiscoveryBonus,
      reachedDepthM,
      remainingFuel,
    }).finalScore;
  }

  return calculateScoreBreakdown(inputOrScanScore).finalScore;
}

/** Alias for callers that use the result-screen terminology. */
export const calculateFinalScoreBreakdown = calculateScoreBreakdown;

function normalizeStreak(value: unknown): number {
  return normalizeNonNegativeInteger(value);
}

function isBaseScore(value: number): value is BaseScore {
  return (BASE_SCORE_VALUES as readonly number[]).includes(value);
}

function hasFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
