import { GAME_HEIGHT } from './config';
import { DIVE_AUTO_DESCENT_SPEED_M_PER_SECOND } from './diveProgression';

/** The only catalog taxa eligible for the V3 set-piece encounter. */
export const LARGE_CREATURE_EVENT_CANDIDATE_IDS = [
  'I021',
  'I022',
] as const;

export type LargeCreatureEventCandidateId =
  (typeof LARGE_CREATURE_EVENT_CANDIDATE_IDS)[number];

export const LARGE_CREATURE_EVENT_WARNING_DEPTH_M = 1_250;
export const LARGE_CREATURE_EVENT_START_DEPTH_M = 1_350;
export const LARGE_CREATURE_EVENT_DURATION_SECONDS = 8.5;
export const LARGE_CREATURE_EVENT_REQUIRED_SECONDS = 2.4;
export const LARGE_CREATURE_EVENT_SCORE = 300;
export const LARGE_CREATURE_EVENT_COLLISION_DAMAGE = 20;
/** The centered horizontal track keeps the event observable from the hull. */
export const LARGE_CREATURE_EVENT_PATH_Y = GAME_HEIGHT / 2;

/**
 * The event crosses the fixed-depth world while the dive continues.  This is
 * useful to callers that reserve a hazard-safe window and to QA that verifies
 * both candidates actually have catalog-supported depth evidence.
 */
export const LARGE_CREATURE_EVENT_END_DEPTH_M =
  LARGE_CREATURE_EVENT_START_DEPTH_M +
  DIVE_AUTO_DESCENT_SPEED_M_PER_SECOND * LARGE_CREATURE_EVENT_DURATION_SECONDS;

export interface LargeCreatureEventCandidate {
  readonly sourceCatalogId: LargeCreatureEventCandidateId;
  readonly acceptedScientificName: string;
  readonly displayName: string;
  /** The catalog spawn-depth interval, not a new biological claim. */
  readonly spawnDepthMinM: number;
  readonly spawnDepthMaxM: number;
  readonly depthSourceUrl: string;
}

/**
 * Candidate metadata mirrors the existing generated catalog.  The event uses
 * only these two already-verified taxa; it does not add a whale or new asset.
 */
export const LARGE_CREATURE_EVENT_CANDIDATES: readonly LargeCreatureEventCandidate[] =
  Object.freeze([
    Object.freeze({
      sourceCatalogId: 'I021' as const,
      acceptedScientificName: 'Architeuthis dux',
      displayName: 'ダイオウイカ',
      spawnDepthMinM: 200,
      spawnDepthMaxM: 1_585,
      depthSourceUrl:
        'https://api.obis.org/v3/occurrence?taxonid=342218&size=1000',
    }),
    Object.freeze({
      sourceCatalogId: 'I022' as const,
      acceptedScientificName: 'Mesonychoteuthis hamiltoni',
      displayName: 'Colossal squid',
      spawnDepthMinM: 200,
      spawnDepthMaxM: 3_111,
      depthSourceUrl:
        'https://api.obis.org/v3/occurrence?taxonid=325299&size=1000',
    }),
  ]);

/** These IDs must be filtered from the ordinary species spawn table. */
export const LARGE_CREATURE_EVENT_EXCLUDED_SOURCE_CATALOG_IDS =
  LARGE_CREATURE_EVENT_CANDIDATE_IDS;

export type LargeCreatureEventStatus =
  | 'idle'
  | 'warned'
  | 'active'
  | 'completed'
  | 'lost';

/** One deterministic event state, created once per dive. */
export interface LargeCreatureEventState {
  readonly status: LargeCreatureEventStatus;
  readonly candidateId: LargeCreatureEventCandidateId;
  readonly eventElapsedSeconds: number;
  readonly identificationSeconds: number;
  readonly scoreAwarded: boolean;
  readonly collisionApplied: boolean;
  /** Becomes true at warning/start and prevents a second event in this dive. */
  readonly runConsumed: boolean;
}

export interface LargeCreatureEventSetup {
  /** Accepted scientific names from the persistent discovery store. */
  readonly knownSpecies?: ReadonlySet<string>;
  /** Count before the current dive; parity selects when both candidates are known. */
  readonly diveCount?: number;
}

export interface LargeCreatureEventAdvanceInput {
  /** Previous and current world depth for boundary-crossing detection. */
  readonly previousDepthM: number;
  readonly currentDepthM: number;
  /** Real seconds represented by this update; invalid values are treated as zero. */
  readonly elapsedSeconds: number;
}

export interface LargeCreatureEventAdvanceResult {
  readonly state: LargeCreatureEventState;
  readonly warningStarted: boolean;
  readonly eventStarted: boolean;
  readonly eventLost: boolean;
}

export interface LargeCreatureEventIdentificationResult {
  readonly state: LargeCreatureEventState;
  readonly completedNow: boolean;
  readonly scoreAwarded: number;
}

export interface LargeCreatureEventCollisionResult {
  readonly state: LargeCreatureEventState;
  readonly collidedNow: boolean;
  readonly damageApplied: number;
}

export interface LargeCreatureEventCandidateValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/** Returns a candidate by its stable catalog ID. */
export function getLargeCreatureEventCandidate(
  sourceCatalogId: string,
): LargeCreatureEventCandidate | undefined {
  return LARGE_CREATURE_EVENT_CANDIDATES.find(
    (candidate) => candidate.sourceCatalogId === sourceCatalogId,
  );
}

/**
 * Selects the event taxon from the pre-dive discovery snapshot.
 *
 * An undiscovered candidate always wins.  When both are known, the previous
 * dive count alternates I021/I022, making replay and QA deterministic.
 */
export function selectLargeCreatureEventCandidate(
  knownSpecies: ReadonlySet<string> = new Set<string>(),
  diveCount = 0,
): LargeCreatureEventCandidate {
  const undiscovered = LARGE_CREATURE_EVENT_CANDIDATES.find(
    (candidate) => !isKnownCandidate(candidate, knownSpecies),
  );
  if (undiscovered) {
    return undiscovered;
  }

  const normalizedDiveCount = normalizeNonNegativeInteger(diveCount);
  return LARGE_CREATURE_EVENT_CANDIDATES[
    normalizedDiveCount % LARGE_CREATURE_EVENT_CANDIDATES.length
  ]!;
}

/** Returns whether an ID must be omitted from ordinary species spawning. */
export function isLargeCreatureEventExcludedFromNormalSpawn(
  sourceCatalogId: string,
): boolean {
  return LARGE_CREATURE_EVENT_EXCLUDED_SOURCE_CATALOG_IDS.includes(
    sourceCatalogId as LargeCreatureEventCandidateId,
  );
}

/** Alias for spawn systems that phrase this as an exclusion predicate. */
export const isExcludedLargeCreatureEventSpecies =
  isLargeCreatureEventExcludedFromNormalSpawn;

/**
 * Normal species are withheld from the warning and active set-piece window.
 * After identification, the block remains until the displayed creature has
 * actually left the scene; a missed event resumes spawning immediately.
 */
export function shouldSuspendNormalSpeciesSpawn(
  state: Pick<LargeCreatureEventState, 'status'>,
  largeCreaturePresent: boolean,
): boolean {
  return state.status === 'warned' ||
    state.status === 'active' ||
    (state.status === 'completed' && largeCreaturePresent);
}

/** Creates the unconsumed state for one dive. */
export function createInitialLargeCreatureEventState(
  setup: LargeCreatureEventSetup = {},
): LargeCreatureEventState {
  const candidate = selectLargeCreatureEventCandidate(
    setup.knownSpecies ?? new Set<string>(),
    setup.diveCount ?? 0,
  );
  return freezeState({
    status: 'idle',
    candidateId: candidate.sourceCatalogId,
    eventElapsedSeconds: 0,
    identificationSeconds: 0,
    scoreAwarded: false,
    collisionApplied: false,
    runConsumed: false,
  });
}

/**
 * Advances the warning/start/end state from a depth interval.
 *
 * Boundary checks are half-open on the previous side and closed on the
 * current side: a threshold is emitted exactly once when depth crosses it.
 */
export function advanceLargeCreatureEvent(
  state: LargeCreatureEventState,
  input: LargeCreatureEventAdvanceInput,
): LargeCreatureEventAdvanceResult {
  const current = normalizeState(state);
  const previousDepth = normalizeDepth(input.previousDepthM);
  const currentDepth = normalizeDepth(input.currentDepthM);
  const elapsedSeconds = normalizePositiveSeconds(input.elapsedSeconds);

  let next = current;
  let warningStarted = false;
  let eventStarted = false;
  let eventLost = false;

  if (current.status === 'idle') {
    warningStarted = crossedDepthBoundary(
      previousDepth,
      currentDepth,
      LARGE_CREATURE_EVENT_WARNING_DEPTH_M,
    );
    const startReached = currentDepth >= LARGE_CREATURE_EVENT_START_DEPTH_M &&
      previousDepth < LARGE_CREATURE_EVENT_START_DEPTH_M;

    if (startReached) {
      eventStarted = true;
      next = {
        ...current,
        status: 'active',
        runConsumed: true,
        eventElapsedSeconds: secondsAfterStartBoundary(
          previousDepth,
          currentDepth,
          elapsedSeconds,
        ),
      };
    } else if (warningStarted) {
      next = {
        ...current,
        status: 'warned',
        runConsumed: true,
      };
    }
  } else if (current.status === 'warned' &&
    currentDepth >= LARGE_CREATURE_EVENT_START_DEPTH_M &&
    previousDepth < LARGE_CREATURE_EVENT_START_DEPTH_M) {
    eventStarted = true;
    next = {
      ...current,
      status: 'active',
      runConsumed: true,
      eventElapsedSeconds: secondsAfterStartBoundary(
        previousDepth,
        currentDepth,
        elapsedSeconds,
      ),
    };
  } else if (current.status === 'active') {
    next = {
      ...current,
      eventElapsedSeconds: clamp(
        current.eventElapsedSeconds + elapsedSeconds,
        0,
        LARGE_CREATURE_EVENT_DURATION_SECONDS,
      ),
    };
  }

  if (next.status === 'active' &&
    next.eventElapsedSeconds >= LARGE_CREATURE_EVENT_DURATION_SECONDS) {
    next = {
      ...next,
      status: 'lost',
      eventElapsedSeconds: LARGE_CREATURE_EVENT_DURATION_SECONDS,
      runConsumed: true,
    };
    eventLost = true;
  }

  return {
    state: freezeState(next),
    warningStarted,
    eventStarted,
    eventLost,
  };
}

/**
 * Adds only light-held observation time. A completed or missed event is
 * immutable, so its score cannot be awarded twice.
 */
export function advanceLargeCreatureEventIdentification(
  state: LargeCreatureEventState,
  illuminated: boolean,
  elapsedSeconds: number,
): LargeCreatureEventIdentificationResult {
  const current = normalizeState(state);
  if (current.status !== 'active' || !illuminated) {
    return { state: freezeState(current), completedNow: false, scoreAwarded: 0 };
  }

  const nextIdentificationSeconds = clamp(
    current.identificationSeconds + normalizePositiveSeconds(elapsedSeconds),
    0,
    LARGE_CREATURE_EVENT_REQUIRED_SECONDS,
  );
  if (nextIdentificationSeconds < LARGE_CREATURE_EVENT_REQUIRED_SECONDS) {
    return {
      state: freezeState({
        ...current,
        identificationSeconds: nextIdentificationSeconds,
      }),
      completedNow: false,
      scoreAwarded: 0,
    };
  }

  return {
    state: freezeState({
      ...current,
      status: 'completed',
      identificationSeconds: LARGE_CREATURE_EVENT_REQUIRED_SECONDS,
      scoreAwarded: true,
      runConsumed: true,
    }),
    completedNow: true,
    scoreAwarded: LARGE_CREATURE_EVENT_SCORE,
  };
}

/**
 * Applies the event collision exactly once. The event remains active after
 * contact, matching the V3 rule that the creature continues across the view.
 */
export function applyLargeCreatureEventCollision(
  state: LargeCreatureEventState,
): LargeCreatureEventCollisionResult {
  const current = normalizeState(state);
  if (
    current.collisionApplied ||
    (current.status !== 'active' && current.status !== 'completed')
  ) {
    return { state: freezeState(current), collidedNow: false, damageApplied: 0 };
  }

  return {
    state: freezeState({ ...current, collisionApplied: true }),
    collidedNow: true,
    damageApplied: LARGE_CREATURE_EVENT_COLLISION_DAMAGE,
  };
}

/** Validates catalog-backed depth evidence and the event's finite constants. */
export function validateLargeCreatureEventCandidate(
  candidate: LargeCreatureEventCandidate,
): LargeCreatureEventCandidateValidation {
  const errors: string[] = [];
  if (!LARGE_CREATURE_EVENT_CANDIDATE_IDS.includes(candidate.sourceCatalogId)) {
    errors.push('candidate ID is not part of the approved event set');
  }
  if (!candidate.acceptedScientificName.trim()) {
    errors.push('accepted scientific name is empty');
  }
  if (!candidate.displayName.trim()) {
    errors.push('display name is empty');
  }
  if (
    !Number.isFinite(candidate.spawnDepthMinM) ||
    !Number.isFinite(candidate.spawnDepthMaxM) ||
    candidate.spawnDepthMinM < 0 ||
    candidate.spawnDepthMinM > candidate.spawnDepthMaxM
  ) {
    errors.push('catalog spawn-depth evidence is not finite and ordered');
  } else {
    if (candidate.spawnDepthMinM > LARGE_CREATURE_EVENT_START_DEPTH_M) {
      errors.push('event start is shallower than the catalog spawn interval');
    }
    if (candidate.spawnDepthMaxM < LARGE_CREATURE_EVENT_END_DEPTH_M) {
      errors.push('event end is deeper than the catalog spawn interval');
    }
  }
  if (!/^https:\/\//u.test(candidate.depthSourceUrl)) {
    errors.push('depth evidence URL is not HTTPS');
  }

  return { valid: errors.length === 0, errors: Object.freeze(errors) };
}

/** Validates every approved event candidate. */
export function validateLargeCreatureEventCandidates(): LargeCreatureEventCandidateValidation {
  const errors = LARGE_CREATURE_EVENT_CANDIDATES.flatMap((candidate) =>
    validateLargeCreatureEventCandidate(candidate).errors.map(
      (error) => `${candidate.sourceCatalogId}: ${error}`,
    ),
  );
  return { valid: errors.length === 0, errors: Object.freeze(errors) };
}

function isKnownCandidate(
  candidate: LargeCreatureEventCandidate,
  knownSpecies: ReadonlySet<string>,
): boolean {
  return knownSpecies.has(candidate.acceptedScientificName) ||
    knownSpecies.has(candidate.sourceCatalogId);
}

function normalizeState(state: LargeCreatureEventState): LargeCreatureEventState {
  const candidateId = LARGE_CREATURE_EVENT_CANDIDATE_IDS.includes(state.candidateId)
    ? state.candidateId
    : LARGE_CREATURE_EVENT_CANDIDATE_IDS[0]!;
  const eventElapsedSeconds = clamp(
    normalizeNonNegativeNumber(state.eventElapsedSeconds),
    0,
    LARGE_CREATURE_EVENT_DURATION_SECONDS,
  );
  const identificationSeconds = clamp(
    normalizeNonNegativeNumber(state.identificationSeconds),
    0,
    LARGE_CREATURE_EVENT_REQUIRED_SECONDS,
  );
  const status = isLargeCreatureEventStatus(state.status)
    ? state.status
    : 'idle';

  return {
    status,
    candidateId,
    eventElapsedSeconds,
    identificationSeconds,
    scoreAwarded: state.scoreAwarded === true || status === 'completed',
    collisionApplied: state.collisionApplied === true,
    runConsumed: state.runConsumed === true || status !== 'idle',
  };
}

function freezeState(state: LargeCreatureEventState): LargeCreatureEventState {
  return Object.freeze(state);
}

function isLargeCreatureEventStatus(
  value: unknown,
): value is LargeCreatureEventStatus {
  return value === 'idle' || value === 'warned' || value === 'active' ||
    value === 'completed' || value === 'lost';
}

function crossedDepthBoundary(
  previousDepthM: number,
  currentDepthM: number,
  boundaryDepthM: number,
): boolean {
  return previousDepthM < boundaryDepthM && currentDepthM >= boundaryDepthM;
}

function secondsAfterStartBoundary(
  previousDepthM: number,
  currentDepthM: number,
  elapsedSeconds: number,
): number {
  if (elapsedSeconds <= 0 || currentDepthM < LARGE_CREATURE_EVENT_START_DEPTH_M) {
    return 0;
  }
  if (previousDepthM >= LARGE_CREATURE_EVENT_START_DEPTH_M ||
    currentDepthM <= previousDepthM) {
    return elapsedSeconds;
  }

  const fractionAfterStart =
    (currentDepthM - LARGE_CREATURE_EVENT_START_DEPTH_M) /
    (currentDepthM - previousDepthM);
  return clamp(elapsedSeconds * fractionAfterStart, 0, elapsedSeconds);
}

function normalizeDepth(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizePositiveSeconds(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeNonNegativeInteger(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function normalizeNonNegativeNumber(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
