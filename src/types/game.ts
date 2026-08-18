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

export interface DiveResultScoreBreakdown {
  readonly scanScore: number;
  readonly firstDiscoveryBonus: number;
  readonly depthBonus: number;
  readonly fuelBonus: number;
  readonly finalScore: number;
}

export interface DiveResultNewDiscovery {
  readonly sourceCatalogId: string;
  readonly displayName: string;
  readonly acceptedScientificName: string;
  readonly category: string;
}

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
  readonly scoreBreakdown: DiveResultScoreBreakdown;
  readonly newDiscoveries: readonly DiveResultNewDiscovery[];
  readonly isNewBest: boolean;
  readonly bestScore: number;
  readonly bestDepthM: number;
  readonly diveCount: number;
  readonly clearCount: number;
}

export interface DiveResultStats {
  readonly score?: unknown;
  readonly discoveredCount?: unknown;
  readonly collectedCount?: unknown;
  readonly scoreBreakdown?: unknown;
  readonly newDiscoveries?: unknown;
  readonly isNewBest?: unknown;
  readonly bestScore?: unknown;
  readonly bestDepthM?: unknown;
  readonly diveCount?: unknown;
  readonly clearCount?: unknown;
}

/** Creates a frozen result snapshot for a terminal dive. */
export function createDiveResultSnapshot(
  state: DiveProgressionState,
  stats: DiveResultStats = {},
): DiveResultSnapshot {
  if (state.status === "descending") {
    throw new Error("A result snapshot requires a terminal dive state");
  }

  const safeStats = isRecord(stats) ? stats : {};
  const legacyScore = normalizeNonNegativeInteger(safeStats.score);
  const scoreBreakdown = normalizeScoreBreakdown(
    safeStats.scoreBreakdown,
    legacyScore,
  );
  const newDiscoveries = normalizeNewDiscoveries(safeStats.newDiscoveries);
  const discoveredCount = safeStats.discoveredCount === undefined
    ? newDiscoveries.length
    : normalizeNonNegativeInteger(safeStats.discoveredCount);

  return Object.freeze({
    outcome: state.status === "cleared" ? "cleared" : "depleted",
    reachedDepthM: normalizeNonNegativeNumber(state.depthM),
    remainingFuel: normalizeNonNegativeNumber(state.fuel),
    elapsedSeconds: normalizeNonNegativeNumber(state.elapsedSeconds),
    score: scoreBreakdown.finalScore,
    discoveredCount,
    collectedCount: normalizeNonNegativeInteger(safeStats.collectedCount),
    scoreBreakdown,
    newDiscoveries,
    isNewBest: safeStats.isNewBest === true,
    bestScore: normalizeNonNegativeInteger(safeStats.bestScore),
    bestDepthM: normalizeNonNegativeInteger(safeStats.bestDepthM),
    diveCount: normalizeNonNegativeInteger(safeStats.diveCount),
    clearCount: normalizeNonNegativeInteger(safeStats.clearCount),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeNonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function normalizeNonNegativeInteger(value: unknown): number {
  return Math.floor(normalizeNonNegativeNumber(value));
}

function normalizeScoreBreakdown(
  value: unknown,
  legacyScore: number,
): DiveResultScoreBreakdown {
  const source = isRecord(value) ? value : undefined;
  const scanScore = source
    ? normalizeNonNegativeInteger(source.scanScore)
    : legacyScore;
  const firstDiscoveryBonus = source
    ? normalizeNonNegativeInteger(source.firstDiscoveryBonus)
    : 0;
  const depthBonus = source ? normalizeNonNegativeInteger(source.depthBonus) : 0;
  const fuelBonus = source ? normalizeNonNegativeInteger(source.fuelBonus) : 0;
  const finalScore = normalizeNonNegativeInteger(
    scanScore + firstDiscoveryBonus + depthBonus + fuelBonus,
  );

  return Object.freeze({
    scanScore,
    firstDiscoveryBonus,
    depthBonus,
    fuelBonus,
    finalScore,
  });
}

function normalizeNewDiscoveries(
  value: unknown,
): readonly DiveResultNewDiscovery[] {
  if (!Array.isArray(value)) {
    return Object.freeze([]);
  }

  const records = value.flatMap((item): DiveResultNewDiscovery[] => {
    if (!isRecord(item)) {
      return [];
    }

    const record = {
      sourceCatalogId: normalizeString(item.sourceCatalogId),
      displayName: normalizeString(item.displayName),
      acceptedScientificName: normalizeString(item.acceptedScientificName),
      category: normalizeString(item.category),
    };

    if (
      !record.sourceCatalogId ||
      !record.displayName ||
      !record.acceptedScientificName ||
      !record.category
    ) {
      return [];
    }

    return [Object.freeze(record)];
  });

  return Object.freeze(records);
}

function normalizeString(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFC").trim().replace(/\s+/gu, " ")
    : "";
}
