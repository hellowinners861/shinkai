import { describe, expect, it } from 'vitest';

import {
  getPixelSpeciesCandidatesForDepth,
  getWeightedSpeciesCandidates,
  selectPixelSpeciesForDepthWithOptions,
  type ChapterSpeciesSelectionOptions,
} from '../src/game/speciesSelectionRules';
import type { CatalogSpeciesRecord } from '../src/game/speciesRules';

const catalog: readonly CatalogSpeciesRecord[] = [
  {
    source_catalog_id: 'F001',
    slug: 'fish',
    accepted_scientific_name: 'Fishus testus',
    display_name: 'fish',
    category: 'fish',
    spawn_depth_min_m: 200,
    spawn_depth_max_m: 6_000,
    game_rarity: 'common',
    spawn_weight: 1,
    behavior_id: 'swim',
    score: 10,
  },
  {
    source_catalog_id: 'I021',
    slug: 'giant-squid',
    accepted_scientific_name: 'Architeuthis dux',
    display_name: 'giant squid',
    category: 'squid',
    spawn_depth_min_m: 200,
    spawn_depth_max_m: 1_585,
    game_rarity: 'common',
    spawn_weight: 1,
    behavior_id: 'swim',
    score: 10,
  },
  {
    source_catalog_id: 'I022',
    slug: 'colossal-squid',
    accepted_scientific_name: 'Mesonychoteuthis hamiltoni',
    display_name: 'colossal squid',
    category: 'squid',
    spawn_depth_min_m: 200,
    spawn_depth_max_m: 6_000,
    game_rarity: 'uncommon',
    spawn_weight: 1,
    behavior_id: 'swim',
    score: 25,
  },
];

describe('chapter-aware species selection', () => {
  it('applies chapter category weights without mutating candidates', () => {
    const candidates = getPixelSpeciesCandidatesForDepth(catalog, 1_200);
    const options: ChapterSpeciesSelectionOptions = { chapter: 2 };
    const weighted = getWeightedSpeciesCandidates(candidates, options);
    const fish = weighted.find((entry) => entry.species.category === 'fish');
    const squid = weighted.find((entry) => entry.species.category === 'squid');

    expect(fish?.effectiveWeight).toBe(1);
    expect(squid?.effectiveWeight).toBe(1.35);
    expect(candidates.every((entry) => entry.weight === 1)).toBe(true);
  });

  it('excludes event-reserved giant squid IDs from normal candidates', () => {
    const options: ChapterSpeciesSelectionOptions = {
      chapter: 2,
      excludeSourceCatalogIds: ['I021', 'I022'],
    };
    const candidates = getPixelSpeciesCandidatesForDepth(catalog, 1_200, options);
    expect(candidates.map((entry) => entry.sourceCatalogId)).toEqual(['F001']);
    expect(selectPixelSpeciesForDepthWithOptions(
      catalog,
      1_200,
      0,
      options,
    )?.sourceCatalogId).toBe('F001');
  });

  it('keeps the weighted choice deterministic for equal inputs', () => {
    const options: ChapterSpeciesSelectionOptions = { chapter: 3 };
    expect(selectPixelSpeciesForDepthWithOptions(catalog, 2_600, 11, options))
      .toEqual(selectPixelSpeciesForDepthWithOptions(catalog, 2_600, 11, options));
  });
});
