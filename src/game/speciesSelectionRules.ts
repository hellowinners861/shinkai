import {
  deterministicSpeciesUnit,
  getApprovedSpeciesAtDepth,
  getPixelSpeciesAtDepth,
  type CatalogSpeciesRecord,
  type SpeciesAssetManifestEntry,
  type SpawnableSpecies,
} from './speciesRules';
import {
  getChapterCategoryWeight,
  type DepthChapter,
  type DepthChapterNumber,
} from './chapterRules';
import type { SpeciesCatalogCategory } from './speciesPixelIcons';

/** Options used when a Scene selects the next normal species encounter. */
export interface ChapterSpeciesSelectionOptions {
  readonly chapter?: DepthChapter | DepthChapterNumber;
  readonly categoryWeights?: Partial<
    Record<SpeciesCatalogCategory, number>
  >;
  /** IDs reserved for a separate event and therefore excluded from normal spawn. */
  readonly excludeSourceCatalogIds?: readonly string[];
}

export interface WeightedSpeciesCandidate {
  readonly species: SpawnableSpecies;
  readonly effectiveWeight: number;
}

/** Applies chapter/category multipliers without mutating catalog species rows. */
export function getWeightedSpeciesCandidates(
  candidates: readonly SpawnableSpecies[],
  options: ChapterSpeciesSelectionOptions = {},
): readonly WeightedSpeciesCandidate[] {
  const excluded = new Set(options.excludeSourceCatalogIds ?? []);
  const weighted = candidates
    .filter((species) => !excluded.has(species.sourceCatalogId))
    .map((species) => ({
      species,
      effectiveWeight: species.weight * getCategoryMultiplier(
        species.category,
        options,
      ),
    }))
    .filter((entry) =>
      Number.isFinite(entry.effectiveWeight) && entry.effectiveWeight > 0,
    );

  return Object.freeze(weighted.map((entry) => Object.freeze(entry)));
}

/** Selects an approved species using depth, chapter weights and exclusions. */
export function selectSpeciesForDepthWithOptions(
  catalog: readonly CatalogSpeciesRecord[],
  assets: readonly SpeciesAssetManifestEntry[],
  depthM: number,
  spawnOrdinal: number,
  options: ChapterSpeciesSelectionOptions = {},
): SpawnableSpecies | undefined {
  const candidates = getApprovedSpeciesAtDepth(catalog, assets, depthM);
  return selectWeightedSpecies(
    candidates,
    depthM,
    spawnOrdinal,
    options,
  );
}

/** Selects a development pixel species using depth, chapter weights and exclusions. */
export function selectPixelSpeciesForDepthWithOptions(
  catalog: readonly CatalogSpeciesRecord[],
  depthM: number,
  spawnOrdinal: number,
  options: ChapterSpeciesSelectionOptions = {},
): SpawnableSpecies | undefined {
  const candidates = getPixelSpeciesAtDepth(catalog, depthM);
  return selectWeightedSpecies(
    candidates,
    depthM,
    spawnOrdinal,
    options,
  );
}

export const selectSpeciesForChapter = selectSpeciesForDepthWithOptions;
export const selectPixelSpeciesForChapter =
  selectPixelSpeciesForDepthWithOptions;

/** Returns candidates after exclusions, useful for event-aware spawn previews. */
export function getPixelSpeciesCandidatesForDepth(
  catalog: readonly CatalogSpeciesRecord[],
  depthM: number,
  options: ChapterSpeciesSelectionOptions = {},
): readonly SpawnableSpecies[] {
  return Object.freeze(
    getPixelSpeciesAtDepth(catalog, depthM)
      .filter((species) => !isExcluded(species, options)),
  );
}

function selectWeightedSpecies(
  candidates: readonly SpawnableSpecies[],
  depthM: number,
  spawnOrdinal: number,
  options: ChapterSpeciesSelectionOptions,
): SpawnableSpecies | undefined {
  const weighted = getWeightedSpeciesCandidates(candidates, options);
  if (weighted.length === 0) {
    return undefined;
  }

  const totalWeight = weighted.reduce(
    (total, entry) => total + entry.effectiveWeight,
    0,
  );
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return undefined;
  }

  const safeDepth = Number.isFinite(depthM) ? Math.floor(depthM) : 0;
  const safeOrdinal = Number.isFinite(spawnOrdinal)
    ? Math.max(0, Math.floor(spawnOrdinal))
    : 0;
  const threshold = deterministicSpeciesUnit(safeDepth, safeOrdinal) *
    totalWeight;
  let accumulated = 0;
  for (const entry of weighted) {
    accumulated += entry.effectiveWeight;
    if (threshold < accumulated) {
      return entry.species;
    }
  }

  return weighted[weighted.length - 1]?.species;
}

function getCategoryMultiplier(
  category: SpeciesCatalogCategory,
  options: ChapterSpeciesSelectionOptions,
): number {
  const explicit = options.categoryWeights?.[category];
  if (explicit !== undefined) {
    return normalizeMultiplier(explicit);
  }

  if (options.chapter !== undefined) {
    return getChapterCategoryWeight(options.chapter, category);
  }

  return 1;
}

function normalizeMultiplier(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0, value);
}

function isExcluded(
  species: SpawnableSpecies,
  options: ChapterSpeciesSelectionOptions,
): boolean {
  return new Set(options.excludeSourceCatalogIds ?? [])
    .has(species.sourceCatalogId);
}
