import type { SpeciesRarity } from './speciesRules';

/** The maximum centre-to-centre distance at which a scan may advance. */
export const ACTIVE_SCAN_RANGE_PX = 96;

/** An unfinished target loses this many seconds of progress per real second. */
export const ACTIVE_SCAN_DECAY_SECONDS_PER_SECOND = 0.75;

const SCAN_RARITIES: readonly SpeciesRarity[] = [
  'common',
  'uncommon',
  'rare',
  'very_rare',
  'legendary',
];

/** Required continuous scan time for each catalog rarity. */
export const SCAN_REQUIRED_SECONDS: Readonly<Record<SpeciesRarity, number>> =
  Object.freeze({
    common: 0.70,
    uncommon: 0.85,
    rare: 1.05,
    very_rare: 1.30,
    legendary: 1.60,
  });

/**
 * The small amount of per-instance state needed by the active scan system.
 *
 * A target may carry additional scene data (species, position, or display
 * metadata); the pure functions in this file copy that data without reading
 * Phaser or mutating the caller's object.
 */
export interface ScanTarget {
  readonly id: string;
  readonly spawnSequence: number;
  readonly centerDistance: number;
  readonly rarity: SpeciesRarity;
  readonly progressSeconds?: number;
  readonly completed?: boolean;
}

export interface ScanTargetState extends ScanTarget {
  readonly progressSeconds: number;
  readonly completed: boolean;
}

export interface ScanProgressUpdate {
  readonly targets: readonly ScanTargetState[];
  readonly activeTargetId?: string;
  readonly completedTargetIds: readonly string[];
}

/** Returns the required scan duration, or zero for an invalid rarity. */
export function getScanRequiredSeconds(rarity: SpeciesRarity): number {
  if (!SCAN_RARITIES.includes(rarity)) {
    return 0;
  }

  return SCAN_REQUIRED_SECONDS[rarity];
}

/** Returns whether a target is close enough for active scanning. */
export function isWithinActiveScanRange(centerDistance: number): boolean {
  return Number.isFinite(centerDistance) &&
    centerDistance >= 0 &&
    centerDistance <= ACTIVE_SCAN_RANGE_PX;
}

/**
 * Chooses exactly one unfinished target in range.
 *
 * Distance is the primary ordering key. Spawn sequence resolves an exact
 * distance tie; preserving input order for a second tie keeps the result
 * deterministic without inventing another gameplay priority.
 */
export function selectActiveScanTarget<T extends ScanTarget>(
  targets: readonly T[],
): T | undefined {
  return findActiveScanTarget(targets)?.target;
}

/** Alias matching the terminology used by scene callers. */
export const chooseActiveScanTarget = selectActiveScanTarget;

/**
 * Advances all active-scan instances by one fixed-time update.
 *
 * Only the selected target gains progress. Every other unfinished target
 * loses 0.75 seconds per real second, clamped at zero. A completed target is
 * immutable from this point onward and can be removed by the scene after it
 * consumes `completedTargetIds`.
 */
export function advanceScanTargets(
  targets: readonly ScanTarget[],
  elapsedSeconds: number,
): ScanProgressUpdate {
  const activeSelection = findActiveScanTarget(targets);
  const activeTargetId = activeSelection?.target.id;
  const activeTargetIndex = activeSelection?.index;
  const seconds = normalizeElapsedSeconds(elapsedSeconds);

  if (seconds === 0) {
    return {
      targets: targets.map(normalizeTarget),
      ...(activeTargetId === undefined ? {} : { activeTargetId }),
      completedTargetIds: [],
    };
  }

  const completedTargetIds: string[] = [];
  const nextTargets = targets.map((target, index) => {
    const current = normalizeTarget(target);
    if (current.completed) {
      return current;
    }

    // Select by array index rather than id so malformed/duplicate ids cannot
    // accidentally make more than one instance active in the same update.
    const isActive = activeTargetIndex !== undefined &&
      index === activeTargetIndex;
    const delta = isActive
      ? seconds
      : -seconds * ACTIVE_SCAN_DECAY_SECONDS_PER_SECOND;
    const requiredSeconds = getScanRequiredSeconds(current.rarity);
    const progressSeconds = requiredSeconds > 0
      ? clamp(current.progressSeconds + delta, 0, requiredSeconds)
      : 0;
    const completed = requiredSeconds > 0 && progressSeconds >= requiredSeconds;

    if (completed) {
      completedTargetIds.push(current.id);
    }

    return {
      ...current,
      progressSeconds,
      completed,
    };
  });

  return {
    targets: nextTargets,
    ...(activeTargetId === undefined ? {} : { activeTargetId }),
    completedTargetIds,
  };
}

/** Alias for callers that describe an update as progress rather than targets. */
export const advanceScanProgress = advanceScanTargets;
export const updateScanProgress = advanceScanTargets;

/** Advances one target without requiring an array allocation at the call site. */
export function advanceScanTarget(
  target: ScanTarget,
  isActive: boolean,
  elapsedSeconds: number,
): ScanTargetState {
  const current = normalizeTarget(target);
  if (current.completed) {
    return current;
  }

  const seconds = normalizeElapsedSeconds(elapsedSeconds);
  const requiredSeconds = getScanRequiredSeconds(current.rarity);
  if (seconds === 0 || requiredSeconds <= 0) {
    return requiredSeconds <= 0
      ? { ...current, progressSeconds: 0 }
      : current;
  }

  const delta = isActive
    ? seconds
    : -seconds * ACTIVE_SCAN_DECAY_SECONDS_PER_SECOND;
  const progressSeconds = clamp(
    current.progressSeconds + delta,
    0,
    requiredSeconds,
  );

  return {
    ...current,
    progressSeconds,
    completed: progressSeconds >= requiredSeconds,
  };
}

/** Returns a clamped 0–100 progress value for an ARIA progress bar. */
export function getScanProgressPercent(target: ScanTarget): number {
  const requiredSeconds = getScanRequiredSeconds(target.rarity);
  if (requiredSeconds <= 0) {
    return 0;
  }

  const progressSeconds = Number.isFinite(target.progressSeconds)
    ? Math.max(0, target.progressSeconds ?? 0)
    : 0;
  return (Math.min(progressSeconds, requiredSeconds) / requiredSeconds) * 100;
}

/** Returns a fresh state value with missing/untrusted fields normalized. */
export function normalizeScanTarget(target: ScanTarget): ScanTargetState {
  return normalizeTarget(target);
}

function normalizeTarget(target: ScanTarget): ScanTargetState {
  const requiredSeconds = getScanRequiredSeconds(target.rarity);
  const rawProgress = Number.isFinite(target.progressSeconds)
    ? Math.max(0, target.progressSeconds ?? 0)
    : 0;
  const completed = target.completed === true ||
    (requiredSeconds > 0 && rawProgress >= requiredSeconds);

  return {
    ...target,
    progressSeconds: requiredSeconds > 0
      ? Math.min(rawProgress, requiredSeconds)
      : 0,
    completed,
  };
}

interface ActiveScanSelection<T extends ScanTarget> {
  readonly target: T;
  readonly index: number;
}

function findActiveScanTarget<T extends ScanTarget>(
  targets: readonly T[],
): ActiveScanSelection<T> | undefined {
  let selected: ActiveScanSelection<T> | undefined;
  let selectedDistance = Number.POSITIVE_INFINITY;
  let selectedSequence = Number.POSITIVE_INFINITY;

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    if (target === undefined || !isUnfinishedScanTarget(target) ||
      !isWithinActiveScanRange(target.centerDistance)) {
      continue;
    }

    const sequence = normalizeSpawnSequence(target.spawnSequence);
    if (
      target.centerDistance < selectedDistance ||
      (target.centerDistance === selectedDistance && sequence < selectedSequence)
    ) {
      selected = { target, index };
      selectedDistance = target.centerDistance;
      selectedSequence = sequence;
    }
  }

  return selected;
}

function isUnfinishedScanTarget(target: ScanTarget): boolean {
  if (target.completed === true) {
    return false;
  }

  const requiredSeconds = getScanRequiredSeconds(target.rarity);
  if (requiredSeconds <= 0) {
    return false;
  }

  const rawProgress = Number.isFinite(target.progressSeconds)
    ? Math.max(0, target.progressSeconds ?? 0)
    : 0;
  return rawProgress < requiredSeconds;
}

function normalizeElapsedSeconds(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeSpawnSequence(value: number): number {
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
