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
  caughtFish: Record<string, number>;
  discoveredFish: Set<string>;
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
  readonly score: 0;
  readonly discoveredCount: 0;
  readonly collectedCount: 0;
}

/** Creates the zero-score MVP result snapshot for a terminal dive. */
export function createDiveResultSnapshot(
  state: DiveProgressionState,
): DiveResultSnapshot {
  if (state.status === "descending") {
    throw new Error("A result snapshot requires a terminal dive state");
  }

  return Object.freeze({
    outcome: state.status,
    reachedDepthM: state.depthM,
    remainingFuel: state.fuel,
    elapsedSeconds: state.elapsedSeconds,
    score: 0 as const,
    discoveredCount: 0 as const,
    collectedCount: 0 as const,
  });
}
