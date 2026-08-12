import {
  circlesOverlap,
  type Circle,
} from './encounterRules';

export const SPECIES_FIRST_SPAWN_SECONDS = 8;
export const SPECIES_SPAWN_INTERVAL_SECONDS = 3.5;
export const MAX_ACTIVE_SPECIES = 6;
export const SPECIES_COLLISION_RADIUS = 20;
export const SPECIES_DETECTION_RADIUS = 112;

export const SPECIES_SPAWN_X_POSITIONS = [
  52,
  110,
  168,
  225,
  282,
  340,
  398,
] as const;

export const SPECIES_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'very_rare',
  'legendary',
] as const;

export type SpeciesRarity = (typeof SPECIES_RARITIES)[number];

export const SPECIES_BEHAVIORS = [
  'swim',
  'drift',
  'crawl',
  'stationary',
] as const;

export type SpeciesBehavior = (typeof SPECIES_BEHAVIORS)[number];

/** The fields consumed from the generated catalog at runtime. */
export interface CatalogSpeciesRecord {
  source_catalog_id: string;
  slug: string;
  accepted_scientific_name: string;
  display_name: string;
  spawn_depth_min_m: number;
  spawn_depth_max_m: number;
  game_rarity: SpeciesRarity;
  spawn_weight: number;
  behavior_id: SpeciesBehavior;
  score: number;
}

/** A local asset row derived from the release-approved asset manifest. */
export interface SpeciesAssetManifestEntry {
  sourceCatalogId: string;
  acceptedScientificName: string;
  assetId: string;
  localPath: string;
  usageStatus: 'reference_only' | 'license_review' | 'release_approved';
  textureKey: string;
  url: string;
}

/** A catalog record that is safe to show in the play scene. */
export interface SpawnableSpecies {
  sourceCatalogId: string;
  slug: string;
  acceptedScientificName: string;
  displayName: string;
  depthMinM: number;
  depthMaxM: number;
  rarity: SpeciesRarity;
  weight: number;
  behavior: SpeciesBehavior;
  score: number;
  assetId: string;
  textureKey: string;
  assetUrl: string;
}

export interface SpeciesSpawnScheduleState {
  lastElapsedSeconds: number;
}

export interface SpeciesSpawnRequest {
  atSeconds: number;
  ordinal: number;
}

export interface SpeciesSpawnScheduleUpdate {
  state: SpeciesSpawnScheduleState;
  spawns: SpeciesSpawnRequest[];
}

export interface SpeciesSpawnPosition {
  x: number;
  y: number;
  radius: number;
}

export interface SpeciesInteractionState {
  discovered: boolean;
  collected: boolean;
}

export interface SpeciesInteractionResult {
  nextState: SpeciesInteractionState;
  discoveredNow: boolean;
  collectedNow: boolean;
  scoreDelta: number;
}

/** Creates a fresh deterministic schedule cursor for one dive. */
export function createInitialSpeciesScheduleState(): SpeciesSpawnScheduleState {
  return { lastElapsedSeconds: 0 };
}

/** Returns the fixed-time species spawn boundaries crossed by an interval. */
export function getDueSpeciesSpawnRequests(
  previousElapsedSeconds: number,
  currentElapsedSeconds: number,
): SpeciesSpawnRequest[] {
  if (
    !Number.isFinite(previousElapsedSeconds) ||
    !Number.isFinite(currentElapsedSeconds) ||
    currentElapsedSeconds <= previousElapsedSeconds
  ) {
    return [];
  }

  const firstIndex = Math.max(
    0,
    Math.floor(
      (previousElapsedSeconds - SPECIES_FIRST_SPAWN_SECONDS) /
        SPECIES_SPAWN_INTERVAL_SECONDS,
    ) + 1,
  );
  const lastIndex = Math.floor(
    (currentElapsedSeconds - SPECIES_FIRST_SPAWN_SECONDS + 1e-9) /
      SPECIES_SPAWN_INTERVAL_SECONDS,
  );

  if (lastIndex < firstIndex) {
    return [];
  }

  const spawns: SpeciesSpawnRequest[] = [];
  for (let ordinal = firstIndex; ordinal <= lastIndex; ordinal += 1) {
    const atSeconds =
      SPECIES_FIRST_SPAWN_SECONDS + ordinal * SPECIES_SPAWN_INTERVAL_SECONDS;
    if (
      atSeconds > previousElapsedSeconds &&
      atSeconds <= currentElapsedSeconds
    ) {
      spawns.push({ atSeconds, ordinal });
    }
  }
  return spawns;
}

/** Advances the schedule without mutating its input state. */
export function advanceSpeciesSpawnSchedule(
  state: SpeciesSpawnScheduleState,
  currentElapsedSeconds: number,
): SpeciesSpawnScheduleUpdate {
  if (
    !Number.isFinite(state.lastElapsedSeconds) ||
    !Number.isFinite(currentElapsedSeconds) ||
    currentElapsedSeconds <= state.lastElapsedSeconds
  ) {
    return { state, spawns: [] };
  }

  return {
    state: { lastElapsedSeconds: currentElapsedSeconds },
    spawns: getDueSpeciesSpawnRequests(
      state.lastElapsedSeconds,
      currentElapsedSeconds,
    ),
  };
}

/**
 * Joins generated catalog metadata with only release-approved local assets,
 * then returns the species whose spawn interval contains the current depth.
 */
export function getApprovedSpeciesAtDepth(
  catalog: readonly CatalogSpeciesRecord[],
  assets: readonly SpeciesAssetManifestEntry[],
  depthM: number,
): SpawnableSpecies[] {
  if (!Number.isFinite(depthM) || depthM < 0) {
    return [];
  }

  const assetsByCatalogId = new Map(
    assets
      .filter(isApprovedLocalAsset)
      .map((asset) => [asset.sourceCatalogId, asset] as const),
  );

  return catalog
    .filter((entry) =>
      entry.spawn_depth_min_m <= depthM &&
      depthM <= entry.spawn_depth_max_m,
    )
    .map((entry) => {
      const asset = assetsByCatalogId.get(entry.source_catalog_id);
      if (!asset || asset.acceptedScientificName !== entry.accepted_scientific_name) {
        return undefined;
      }
      return toSpawnableSpecies(entry, asset);
    })
    .filter((entry): entry is SpawnableSpecies => entry !== undefined)
    .sort((first, second) =>
      first.sourceCatalogId.localeCompare(second.sourceCatalogId, 'en'),
    );
}

/** Selects one eligible species with a stable weighted choice. */
export function selectSpeciesForDepth(
  catalog: readonly CatalogSpeciesRecord[],
  assets: readonly SpeciesAssetManifestEntry[],
  depthM: number,
  spawnOrdinal: number,
): SpawnableSpecies | undefined {
  const candidates = getApprovedSpeciesAtDepth(catalog, assets, depthM);
  if (candidates.length === 0) {
    return undefined;
  }

  const totalWeight = candidates.reduce(
    (total, candidate) => total + candidate.weight,
    0,
  );
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return undefined;
  }

  const normalizedOrdinal = Number.isFinite(spawnOrdinal)
    ? Math.max(0, Math.floor(spawnOrdinal))
    : 0;
  const threshold =
    deterministicSpeciesUnit(Math.floor(depthM), normalizedOrdinal) *
    totalWeight;
  let accumulatedWeight = 0;
  for (const candidate of candidates) {
    accumulatedWeight += candidate.weight;
    if (threshold < accumulatedWeight) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}

/** Returns the stable pseudo-random value used by species selection. */
export function deterministicSpeciesUnit(
  depthM: number,
  spawnOrdinal: number,
): number {
  const depthSeed = Number.isFinite(depthM) ? Math.floor(depthM) : 0;
  const ordinalSeed = Number.isFinite(spawnOrdinal)
    ? Math.floor(spawnOrdinal)
    : 0;
  let value =
    Math.imul(depthSeed | 0, 0x45d9f3b) ^
    Math.imul(ordinalSeed | 0, 0x27d4eb2d);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 13), 0x119de1f3);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
}

/** Chooses the first stable lane that does not overlap an occupied circle. */
export function chooseNonOverlappingSpeciesPosition(
  seed: number,
  y: number,
  radius: number,
  occupied: readonly Circle[],
  laneXPositions: readonly number[] = SPECIES_SPAWN_X_POSITIONS,
): SpeciesSpawnPosition | undefined {
  if (
    !Number.isFinite(seed) ||
    !Number.isFinite(y) ||
    !Number.isFinite(radius) ||
    radius < 0 ||
    laneXPositions.length === 0
  ) {
    return undefined;
  }

  const offset = Math.floor(
    deterministicSpeciesUnit(seed, laneXPositions.length) *
      laneXPositions.length,
  );
  for (let index = 0; index < laneXPositions.length; index += 1) {
    const x = laneXPositions[(index + offset) % laneXPositions.length];
    if (x === undefined) {
      continue;
    }
    const candidate = { x, y, radius };
    if (occupied.every((circle) => !circlesOverlap(candidate, circle))) {
      return candidate;
    }
  }

  return undefined;
}

/** Keeps the species population below the mobile playfield budget. */
export function canSpawnSpecies(
  activeSpeciesCount: number,
  maximumActiveSpecies = MAX_ACTIVE_SPECIES,
): boolean {
  return Number.isFinite(activeSpeciesCount) &&
    Number.isFinite(maximumActiveSpecies) &&
    activeSpeciesCount >= 0 &&
    maximumActiveSpecies > 0 &&
    activeSpeciesCount < maximumActiveSpecies;
}

/** Applies detection and contact exactly once for one spawned individual. */
export function resolveSpeciesInteraction(
  state: SpeciesInteractionState,
  player: Circle,
  species: Circle,
  speciesScore: number,
): SpeciesInteractionResult {
  const discoveredNow = !state.discovered && circlesOverlap(
    { ...player, radius: SPECIES_DETECTION_RADIUS },
    species,
  );
  const collectedNow = !state.collected && circlesOverlap(player, species);
  const nextState = {
    discovered: state.discovered || discoveredNow || collectedNow,
    collected: state.collected || collectedNow,
  };

  return {
    nextState,
    discoveredNow,
    collectedNow,
    scoreDelta: collectedNow && Number.isFinite(speciesScore)
      ? Math.max(0, speciesScore)
      : 0,
  };
}

/** Maps catalog behavior to one of the fixed upward scroll speeds. */
export function getSpeciesScrollSpeed(behavior: SpeciesBehavior): number {
  switch (behavior) {
    case 'swim':
      return 82;
    case 'drift':
      return 62;
    case 'crawl':
      return 48;
    case 'stationary':
      return 38;
  }
}

function isApprovedLocalAsset(
  asset: SpeciesAssetManifestEntry,
): boolean {
  return asset.usageStatus === 'release_approved' &&
    asset.assetId.length > 0 &&
    /^assets\/species\//u.test(asset.localPath) &&
    asset.url.length > 0 &&
    !/^(?:https?:)?\/\//u.test(asset.url);
}

function toSpawnableSpecies(
  entry: CatalogSpeciesRecord,
  asset: SpeciesAssetManifestEntry,
): SpawnableSpecies | undefined {
  if (
    !Number.isFinite(entry.spawn_depth_min_m) ||
    !Number.isFinite(entry.spawn_depth_max_m) ||
    entry.spawn_depth_min_m > entry.spawn_depth_max_m ||
    !Number.isFinite(entry.spawn_weight) ||
    entry.spawn_weight <= 0 ||
    !Number.isFinite(entry.score) ||
    entry.score < 0 ||
    !SPECIES_RARITIES.includes(entry.game_rarity) ||
    !SPECIES_BEHAVIORS.includes(entry.behavior_id)
  ) {
    return undefined;
  }

  return {
    sourceCatalogId: entry.source_catalog_id,
    slug: entry.slug,
    acceptedScientificName: entry.accepted_scientific_name,
    displayName: entry.display_name || entry.accepted_scientific_name,
    depthMinM: entry.spawn_depth_min_m,
    depthMaxM: entry.spawn_depth_max_m,
    rarity: entry.game_rarity,
    weight: entry.spawn_weight,
    behavior: entry.behavior_id,
    score: entry.score,
    assetId: asset.assetId,
    textureKey: asset.textureKey,
    assetUrl: asset.url,
  };
}
