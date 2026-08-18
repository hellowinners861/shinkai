export const RUN_PROGRESS_STORAGE_KEY = "shinkai.runProgress";
export const RUN_PROGRESS_VERSION = 1 as const;

export interface RunProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The small persistent record shared by the title and result screens. */
export interface RunProgress {
  readonly diveCount: number;
  readonly clearCount: number;
  readonly bestScore: number;
  readonly bestDepthM: number;
}

/**
 * A terminal result-like value accepted by the pure updater.  The fields are
 * intentionally optional because existing result snapshots and future V2
 * snapshots use slightly different names for the same values.
 */
export interface RunResultLike {
  readonly outcome?: unknown;
  readonly status?: unknown;
  readonly result?: unknown;
  readonly cleared?: unknown;
  readonly score?: unknown;
  readonly finalScore?: unknown;
  readonly totalScore?: unknown;
  readonly reachedDepthM?: unknown;
  readonly depthM?: unknown;
  readonly depth?: unknown;
  readonly sessionId?: unknown;
  readonly resultId?: unknown;
  readonly runId?: unknown;
  readonly id?: unknown;
  readonly idempotencyKey?: unknown;
}

/** Immutable guard state for applying one result at most once. */
export interface RunProgressUpdateGuard {
  readonly appliedResultKeys: ReadonlySet<string>;
}

export interface RunProgressUpdateResult {
  readonly progress: RunProgress;
  readonly guard: RunProgressUpdateGuard;
  readonly updated: boolean;
}

interface PersistedRunProgress {
  version: typeof RUN_PROGRESS_VERSION;
  diveCount: number;
  clearCount: number;
  bestScore: number;
  bestDepthM: number;
}

/** Returns a fresh empty progress value. */
export function createEmptyRunProgress(): RunProgress {
  return {
    diveCount: 0,
    clearCount: 0,
    bestScore: 0,
    bestDepthM: 0,
  };
}

/** Alias matching the score/state factory naming used elsewhere. */
export const createInitialRunProgress = createEmptyRunProgress;

/** Gets localStorage without allowing SSR/private-mode failures to escape. */
export function getRunProgressStorage(): RunProgressStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Safely reads and normalizes the V1 run progress record. */
export function readRunProgress(
  storage: RunProgressStorage | undefined = getRunProgressStorage(),
): RunProgress {
  if (!storage) {
    return createEmptyRunProgress();
  }

  try {
    const raw = storage.getItem(RUN_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return createEmptyRunProgress();
    }

    return parseRunProgress(raw);
  } catch {
    return createEmptyRunProgress();
  }
}

/** Safely writes a normalized V1 record; unavailable storage is a no-op. */
export function writeRunProgress(
  progress: RunProgress,
  storage: RunProgressStorage | undefined = getRunProgressStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      RUN_PROGRESS_STORAGE_KEY,
      JSON.stringify(toPersistedRunProgress(progress)),
    );
    return true;
  } catch {
    return false;
  }
}

/** Parses one storage payload; malformed JSON and unknown versions reset safely. */
export function parseRunProgress(raw: string): RunProgress {
  try {
    return normalizeRunProgress(JSON.parse(raw) as unknown);
  } catch {
    return createEmptyRunProgress();
  }
}

/**
 * Normalizes an untrusted progress object.  The persisted schema is strict:
 * version 1 and all four fields must be finite, non-negative numbers.  A
 * malformed field resets the whole record, preventing partial/corrupt saves
 * from becoming a surprisingly valid personal best.
 */
export function normalizeRunProgress(value: unknown): RunProgress {
  if (!isRecord(value) || value.version !== RUN_PROGRESS_VERSION) {
    return createEmptyRunProgress();
  }

  const values = [
    value.diveCount,
    value.clearCount,
    value.bestScore,
    value.bestDepthM,
  ];
  if (values.some((item) => !isFiniteNonNegativeNumber(item))) {
    return createEmptyRunProgress();
  }

  return {
    diveCount: normalizeInteger(value.diveCount),
    clearCount: normalizeInteger(value.clearCount),
    bestScore: normalizeInteger(value.bestScore),
    bestDepthM: normalizeInteger(value.bestDepthM),
  };
}

/**
 * Applies one terminal result without mutating the supplied progress.  A
 * caller that needs replay protection can use `updateRunProgressOnce` and
 * keep its returned guard in session state.
 */
export function updateRunProgress(
  progress: RunProgress,
  result: RunResultLike,
): RunProgress {
  const current = normalizeRuntimeProgress(progress);
  if (!isRecord(result)) {
    return current;
  }

  const score = readResultInteger(
    result.finalScore,
    result.score,
    result.totalScore,
  );
  const reachedDepthM = readResultInteger(
    result.reachedDepthM,
    result.depthM,
    result.depth,
  );

  return {
    diveCount: current.diveCount + 1,
    clearCount: current.clearCount + (isClearedResult(result) ? 1 : 0),
    bestScore: Math.max(current.bestScore, score),
    bestDepthM: Math.max(current.bestDepthM, reachedDepthM),
  };
}

/** Alias matching the result-commit terminology. */
export const recordRunResult = updateRunProgress;
export const applyRunResult = updateRunProgress;

/** Creates an empty immutable-by-convention result guard. */
export function createRunProgressUpdateGuard(
  appliedResultKeys: Iterable<string> = [],
): RunProgressUpdateGuard {
  return { appliedResultKeys: new Set(appliedResultKeys) };
}

export const createRunProgressGuard = createRunProgressUpdateGuard;

/**
 * Pure, idempotent result application.  The supplied guard is never mutated;
 * the returned guard contains the new key.  A result without a stable
 * session/result key cannot be deduplicated and is therefore applied once per
 * explicit call.
 */
export function updateRunProgressOnce(
  progress: RunProgress,
  result: RunResultLike,
  guard: RunProgressUpdateGuard | ReadonlySet<string> =
    createRunProgressUpdateGuard(),
): RunProgressUpdateResult {
  const normalizedGuard = asGuard(guard);
  const resultKey = getRunResultKey(result);
  if (
    resultKey !== undefined &&
    normalizedGuard.appliedResultKeys.has(resultKey)
  ) {
    return {
      progress: normalizeRuntimeProgress(progress),
      guard: normalizedGuard,
      updated: false,
    };
  }

  const nextProgress = updateRunProgress(progress, result);
  if (resultKey === undefined) {
    return {
      progress: nextProgress,
      guard: normalizedGuard,
      updated: true,
    };
  }

  const nextKeys = new Set(normalizedGuard.appliedResultKeys);
  nextKeys.add(resultKey);
  return {
    progress: nextProgress,
    guard: { appliedResultKeys: nextKeys },
    updated: true,
  };
}

/** Alias emphasizing that the result is committed exactly once. */
export const applyRunResultOnce = updateRunProgressOnce;
export const recordRunResultOnce = updateRunProgressOnce;

/** Returns the stable key used by the idempotent guard, when present. */
export function getRunResultKey(result: RunResultLike): string | undefined {
  if (!isRecord(result)) {
    return undefined;
  }

  const explicit = normalizeKey(result.idempotencyKey);
  if (explicit !== undefined) {
    return `key:${explicit}`;
  }

  const sessionId = normalizeKey(result.sessionId ?? result.runId);
  const resultId = normalizeKey(result.resultId ?? result.id);
  if (sessionId !== undefined && resultId !== undefined) {
    return `session:${sessionId}|result:${resultId}`;
  }

  if (resultId !== undefined) {
    return `result:${resultId}`;
  }

  if (sessionId !== undefined) {
    return `session:${sessionId}`;
  }

  return undefined;
}

function toPersistedRunProgress(progress: RunProgress): PersistedRunProgress {
  const normalized = normalizeRuntimeProgress(progress);
  return {
    version: RUN_PROGRESS_VERSION,
    diveCount: normalized.diveCount,
    clearCount: normalized.clearCount,
    bestScore: normalized.bestScore,
    bestDepthM: normalized.bestDepthM,
  };
}

function normalizeRuntimeProgress(value: unknown): RunProgress {
  if (!isRecord(value)) {
    return createEmptyRunProgress();
  }

  return {
    diveCount: normalizeInteger(value.diveCount),
    clearCount: normalizeInteger(value.clearCount),
    bestScore: normalizeInteger(value.bestScore),
    bestDepthM: normalizeInteger(value.bestDepthM),
  };
}

function isClearedResult(result: RunResultLike): boolean {
  if (result.cleared === true) {
    return true;
  }

  const outcome = result.outcome ?? result.status ?? result.result;
  return outcome === "cleared" || outcome === "clear" || outcome === "success";
}

function readResultInteger(...values: readonly unknown[]): number {
  for (const value of values) {
    if (isFiniteNonNegativeNumber(value)) {
      return normalizeInteger(value);
    }
  }

  return 0;
}

function normalizeInteger(value: unknown): number {
  return isFiniteNonNegativeNumber(value) ? Math.floor(value) : 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function normalizeKey(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const key = value.trim();
  return key.length > 0 ? key : undefined;
}

function asGuard(
  value: RunProgressUpdateGuard | ReadonlySet<string>,
): RunProgressUpdateGuard {
  if (isReadonlySet(value)) {
    return { appliedResultKeys: value };
  }

  return value;
}

function isReadonlySet(value: unknown): value is ReadonlySet<string> {
  return value instanceof Set;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
