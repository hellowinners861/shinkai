export const DISCOVERY_STORAGE_KEY = "shinkai.discoveryProgress";

export interface DiscoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DiscoveryProgress {
  readonly discoveredSpecies: ReadonlySet<string>;
  readonly collectedSpecies: Readonly<Record<string, number>>;
}

interface PersistedDiscoveryProgress {
  version: 1;
  discoveredSpecies: string[];
  collectedSpecies: Record<string, number>;
}

const EMPTY_PROGRESS: DiscoveryProgress = Object.freeze({
  discoveredSpecies: new Set<string>(),
  collectedSpecies: Object.freeze({}),
});

/** Returns a fresh empty progress value for a new session or unavailable storage. */
export function createEmptyDiscoveryProgress(): DiscoveryProgress {
  return {
    discoveredSpecies: new Set<string>(),
    collectedSpecies: {},
  };
}

/** Gets localStorage without allowing private browsing/storage failures to escape. */
export function getDiscoveryStorage(): DiscoveryStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Safely reads and normalizes persisted discovery progress. */
export function readDiscoveryProgress(
  storage: DiscoveryStorage | undefined = getDiscoveryStorage(),
): DiscoveryProgress {
  if (!storage) {
    return createEmptyDiscoveryProgress();
  }

  try {
    const raw = storage.getItem(DISCOVERY_STORAGE_KEY);
    if (!raw) {
      return createEmptyDiscoveryProgress();
    }

    return parseDiscoveryProgress(raw);
  } catch {
    return createEmptyDiscoveryProgress();
  }
}

/** Safely writes normalized progress. Returns false when storage is unavailable. */
export function writeDiscoveryProgress(
  progress: DiscoveryProgress,
  storage: DiscoveryStorage | undefined = getDiscoveryStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      DISCOVERY_STORAGE_KEY,
      JSON.stringify(toPersistedDiscoveryProgress(progress)),
    );
    return true;
  } catch {
    return false;
  }
}

/** Parses one storage payload; malformed JSON or a malformed root is ignored. */
export function parseDiscoveryProgress(raw: string): DiscoveryProgress {
  try {
    const parsed: unknown = JSON.parse(raw);
    return normalizePersistedValue(parsed);
  } catch {
    return createEmptyDiscoveryProgress();
  }
}

/** Adds session discovery and acquisition without mutating either input. */
export function mergeDiscoveryProgress(
  persisted: DiscoveryProgress,
  sessionDiscovered: Iterable<unknown>,
  sessionCollected: Record<string, unknown> | Readonly<Record<string, unknown>>,
): DiscoveryProgress {
  const normalized = normalizeProgress(persisted);
  const discoveredSpecies = new Set(normalized.discoveredSpecies);
  const collectedSpecies = { ...normalized.collectedSpecies };

  for (const value of sessionDiscovered) {
    const name = normalizeSpeciesName(value);
    if (name) {
      discoveredSpecies.add(name);
    }
  }

  for (const [rawName, rawCount] of Object.entries(sessionCollected)) {
    const name = normalizeSpeciesName(rawName);
    const count = normalizeCollectionCount(rawCount);
    if (!name || count === undefined) {
      continue;
    }

    discoveredSpecies.add(name);
    collectedSpecies[name] = (collectedSpecies[name] ?? 0) + count;
  }

  return {
    discoveredSpecies,
    collectedSpecies,
  };
}

/** Adds one discovered species without mutating the supplied progress. */
export function recordSpeciesDiscovery(
  progress: DiscoveryProgress,
  acceptedScientificName: string,
): DiscoveryProgress {
  return mergeDiscoveryProgress(progress, [acceptedScientificName], {});
}

/** Adds one acquisition without mutating the supplied progress. */
export function recordSpeciesCollection(
  progress: DiscoveryProgress,
  acceptedScientificName: string,
  count = 1,
): DiscoveryProgress {
  return mergeDiscoveryProgress(
    progress,
    [],
    { [acceptedScientificName]: count },
  );
}

/** Counts total acquired samples from a normalized or untrusted progress value. */
export function countCollectedSpecies(progress: DiscoveryProgress): number {
  return Object.values(normalizeProgress(progress).collectedSpecies).reduce(
    (total, count) => total + count,
    0,
  );
}

function normalizePersistedValue(value: unknown): DiscoveryProgress {
  if (!isRecord(value)) {
    return createEmptyDiscoveryProgress();
  }

  if ("version" in value && value.version !== 1) {
    return createEmptyDiscoveryProgress();
  }

  const discoveredSpecies = new Set<string>();
  if (Array.isArray(value.discoveredSpecies)) {
    for (const item of value.discoveredSpecies) {
      const name = normalizeSpeciesName(item);
      if (name) {
        discoveredSpecies.add(name);
      }
    }
  }

  const collectedSpecies: Record<string, number> = {};
  if (isRecord(value.collectedSpecies)) {
    for (const [rawName, rawCount] of Object.entries(value.collectedSpecies)) {
      const name = normalizeSpeciesName(rawName);
      const count = normalizeCollectionCount(rawCount);
      if (!name || count === undefined) {
        continue;
      }

      discoveredSpecies.add(name);
      collectedSpecies[name] = count;
    }
  }

  return { discoveredSpecies, collectedSpecies };
}

function normalizeProgress(progress: DiscoveryProgress): DiscoveryProgress {
  if (!progress || typeof progress !== "object") {
    return EMPTY_PROGRESS;
  }

  const discoveredSpecies = new Set<string>();
  for (const value of progress.discoveredSpecies ?? []) {
    const name = normalizeSpeciesName(value);
    if (name) {
      discoveredSpecies.add(name);
    }
  }

  const collectedSpecies: Record<string, number> = {};
  for (const [rawName, rawCount] of Object.entries(
    progress.collectedSpecies ?? {},
  )) {
    const name = normalizeSpeciesName(rawName);
    const count = normalizeCollectionCount(rawCount);
    if (!name || count === undefined) {
      continue;
    }

    discoveredSpecies.add(name);
    collectedSpecies[name] = count;
  }

  return { discoveredSpecies, collectedSpecies };
}

function toPersistedDiscoveryProgress(
  progress: DiscoveryProgress,
): PersistedDiscoveryProgress {
  const normalized = normalizeProgress(progress);
  const collectedSpecies = Object.fromEntries(
    Object.entries(normalized.collectedSpecies).sort(([first], [second]) =>
      first.localeCompare(second, "en"),
    ),
  );

  return {
    version: 1,
    discoveredSpecies: [...normalized.discoveredSpecies].sort((first, second) =>
      first.localeCompare(second, "en"),
    ),
    collectedSpecies,
  };
}

function normalizeSpeciesName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCollectionCount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const count = Math.floor(value);
  return count > 0 ? count : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
