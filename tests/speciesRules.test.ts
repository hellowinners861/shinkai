import { describe, expect, it } from 'vitest';

import {
  advanceSpeciesSpawnSchedule,
  chooseNonOverlappingSpeciesPosition,
  createInitialSpeciesScheduleState,
  getApprovedSpeciesAtDepth,
  getDueSpeciesSpawnRequests,
  resolveSpeciesInteraction,
  selectSpeciesForDepth,
  type CatalogSpeciesRecord,
  type SpeciesAssetManifestEntry,
} from '../src/game/speciesRules';

const catalog: CatalogSpeciesRecord[] = [
  {
    source_catalog_id: 'F001',
    slug: 'pelican-eel',
    accepted_scientific_name: 'Eurypharynx pelecanoides',
    display_name: 'フクロウナギ',
    spawn_depth_min_m: 500,
    spawn_depth_max_m: 6_000,
    game_rarity: 'legendary',
    spawn_weight: 0.05,
    behavior_id: 'swim',
    score: 100,
  },
  {
    source_catalog_id: 'F008',
    slug: 'long-snouted-lancetfish',
    accepted_scientific_name: 'Alepisaurus ferox',
    display_name: 'ミズウオ',
    spawn_depth_min_m: 200,
    spawn_depth_max_m: 1_830,
    game_rarity: 'common',
    spawn_weight: 1,
    behavior_id: 'swim',
    score: 10,
  },
];

const assets: SpeciesAssetManifestEntry[] = catalog.map((entry) => ({
  sourceCatalogId: entry.source_catalog_id,
  acceptedScientificName: entry.accepted_scientific_name,
  assetId: 'commons-' + entry.source_catalog_id.toLowerCase(),
  localPath: 'assets/species/' + entry.slug + '.jpg',
  usageStatus: 'release_approved',
  textureKey: 'species-' + entry.source_catalog_id.toLowerCase(),
  url: '/assets/species/' + entry.slug + '.jpg',
}));

describe('species encounter rules', () => {
  it('filters by current depth and approved local assets only', () => {
    expect(getApprovedSpeciesAtDepth(catalog, assets, 199)).toEqual([]);
    expect(
      getApprovedSpeciesAtDepth(catalog, assets, 200).map(
        (species) => species.sourceCatalogId,
      ),
    ).toEqual(['F008']);

    const unapproved = assets.map((asset) => ({
      ...asset,
      usageStatus: 'reference_only' as const,
    }));
    expect(getApprovedSpeciesAtDepth(catalog, unapproved, 600)).toEqual([]);
  });

  it('selects deterministically while preserving catalog rarity, weight, behavior, and score', () => {
    const first = selectSpeciesForDepth(catalog, assets, 600, 7);
    const second = selectSpeciesForDepth(catalog, assets, 600, 7);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      rarity: expect.any(String),
      weight: expect.any(Number),
      behavior: 'swim',
      score: expect.any(Number),
    });
  });

  it('emits each crossed schedule boundary once', () => {
    expect(getDueSpeciesSpawnRequests(0, 7.99)).toEqual([]);
    expect(getDueSpeciesSpawnRequests(0, 15)).toEqual([
      { atSeconds: 8, ordinal: 0 },
      { atSeconds: 11.5, ordinal: 1 },
      { atSeconds: 15, ordinal: 2 },
    ]);

    const first = advanceSpeciesSpawnSchedule(
      createInitialSpeciesScheduleState(),
      8,
    );
    expect(first.spawns).toEqual([{ atSeconds: 8, ordinal: 0 }]);
    expect(advanceSpeciesSpawnSchedule(first.state, 8).spawns).toEqual([]);
  });

  it('chooses a non-overlapping lane or skips when every lane is occupied', () => {
    const position = chooseNonOverlappingSpeciesPosition(
      4,
      680,
      20,
      [{ x: 225, y: 680, radius: 30 }],
      [225, 320],
    );
    expect(position).toEqual({ x: 320, y: 680, radius: 20 });

    expect(
      chooseNonOverlappingSpeciesPosition(
        4,
        680,
        20,
        [
          { x: 225, y: 680, radius: 30 },
          { x: 320, y: 680, radius: 30 },
        ],
        [225, 320],
      ),
    ).toBeUndefined();
  });

  it('discovers once in the light range and collects once on contact', () => {
    const initial = { discovered: false, collected: false };
    const detected = resolveSpeciesInteraction(
      initial,
      { x: 100, y: 100, radius: 24 },
      { x: 190, y: 100, radius: 20 },
      50,
    );
    expect(detected.discoveredNow).toBe(true);
    expect(detected.collectedNow).toBe(false);
    expect(detected.scoreDelta).toBe(0);

    const collected = resolveSpeciesInteraction(
      detected.nextState,
      { x: 100, y: 100, radius: 24 },
      { x: 120, y: 100, radius: 20 },
      50,
    );
    expect(collected.collectedNow).toBe(true);
    expect(collected.scoreDelta).toBe(50);

    const repeated = resolveSpeciesInteraction(
      collected.nextState,
      { x: 100, y: 100, radius: 24 },
      { x: 120, y: 100, radius: 20 },
      50,
    );
    expect(repeated.discoveredNow).toBe(false);
    expect(repeated.collectedNow).toBe(false);
    expect(repeated.scoreDelta).toBe(0);
  });
});
