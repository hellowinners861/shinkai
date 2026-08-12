import type { DiveProgressionState } from "../game/diveProgression";

export type GamePhase =
  | "title"
  | "playing"
  | "paused"
  | "cleared"
  | "gameOver";

export interface GameSession {
  phase: GamePhase;
  depth: number;
  fuel: number;
  score: number;
  collectedSpecies: Record<string, number>;
  discoveredSpecies: Set<string>;
  elapsedSeconds: number;
}

export type DiveResultOutcome = Extract<
  DiveProgressionState["status"],
  "cleared" | "depleted"
>;

/**
 * The terminal values handed from GameScene to ResultScene.
 *
 * Result values are intentionally readonly and the factory freezes the
 * runtime object so a later screen cannot mutate the completed session.
 */
export interface DiveResultSnapshot {
  readonly outcome: DiveResultOutcome;
  readonly reachedDepthM: number;
  readonly remainingFuel: number;
  readonly elapsedSeconds: number;
  readonly score: number;
  readonly discoveredCount: number;
  readonly collectedCount: number;
}

export interface DiveResultStats {
  score: number;
  discoveredCount: number;
  collectedCount: number;
}

/** Creates a frozen result snapshot for a terminal dive. */
export function createDiveResultSnapshot(
  state: DiveProgressionState,
  stats: DiveResultStats = {
    score: 0,
    discoveredCount: 0,
    collectedCount: 0,
  },
): DiveResultSnapshot {
  if (state.status === "descending") {
    throw new Error("A result snapshot requires a terminal dive state");
  }

  return Object.freeze({
    outcome: state.status,
    reachedDepthM: state.depthM,
    remainingFuel: state.fuel,
    elapsedSeconds: state.elapsedSeconds,
    score: normalizeNonNegativeNumber(stats.score),
    discoveredCount: normalizeNonNegativeInteger(stats.discoveredCount),
    collectedCount: normalizeNonNegativeInteger(stats.collectedCount),
  });
}

function normalizeNonNegativeNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeNonNegativeInteger(value: number): number {
  return Math.floor(normalizeNonNegativeNumber(value));
}
