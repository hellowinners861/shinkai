import catalogData from '../src/data/generated/speciesCatalog.json';
import { describe, expect, it } from 'vitest';

import {
  getSpeciesPixelIconDefinition,
  getSpeciesPixelIconDefinitionForSpecies,
  getSpeciesPixelIconFamily,
  getSpeciesPixelIconVariant,
  SPECIES_PIXEL_ICON_SPECIFIC_DEFINITIONS,
} from '../src/game/speciesPixelIcons/registry';
import { SPECIES_PIXEL_ICON_DEFINITIONS } from '../src/game/speciesPixelIcons/fallbackDefinitions';
import {
  SPECIES_PIXEL_ICON_FAMILIES,
  SPECIES_PIXEL_ICON_VARIANTS,
} from '../src/game/speciesPixelIcons/model';

type CatalogEntry = {
  source_catalog_id: string;
  category: string;
};

const catalog = catalogData as readonly CatalogEntry[];

describe('species pixel icon assignment', () => {
  it('provides one unique species-specific definition for every catalog ID', () => {
    expect(SPECIES_PIXEL_ICON_SPECIFIC_DEFINITIONS).toHaveLength(149);

    const specificIds = SPECIES_PIXEL_ICON_SPECIFIC_DEFINITIONS.map(
      (definition) => definition.id,
    );
    expect(new Set(specificIds).size).toBe(specificIds.length);
    expect(specificIds.every((id) => id.startsWith('species:'))).toBe(true);
    expect(new Set(specificIds)).toEqual(
      new Set(catalog.map((entry) => `species:${entry.source_catalog_id}`)),
    );
  });

  it('resolves every generated catalog entry to non-empty icon rectangles', () => {
    for (const entry of catalog) {
      const definition = getSpeciesPixelIconDefinitionForSpecies({
        sourceCatalogId: entry.source_catalog_id,
        category: entry.category,
      });

      expect(definition?.id).toBe(`species:${entry.source_catalog_id}`);
      expect(definition?.rects.length).toBeGreaterThan(0);
    }
  });

  it('contains exactly three definitions for every icon family', () => {
    expect(SPECIES_PIXEL_ICON_DEFINITIONS).toHaveLength(24);
    expect(SPECIES_PIXEL_ICON_DEFINITIONS).toHaveLength(
      SPECIES_PIXEL_ICON_FAMILIES.length * SPECIES_PIXEL_ICON_VARIANTS.length,
    );

    for (const family of SPECIES_PIXEL_ICON_FAMILIES) {
      for (const variant of SPECIES_PIXEL_ICON_VARIANTS) {
        expect(getSpeciesPixelIconDefinition(family, variant)).toMatchObject({
          family,
          variant,
        });
      }
    }
  });

  it('keeps the explicitly slender and regular fish assignments', () => {
    expect(
      getSpeciesPixelIconFamily({ sourceCatalogId: 'F001', category: 'fish' }),
    ).toBe('slender_fish');
    expect(
      getSpeciesPixelIconFamily({ sourceCatalogId: 'F008', category: 'fish' }),
    ).toBe('slender_fish');
    expect(
      getSpeciesPixelIconFamily({ sourceCatalogId: 'F007', category: 'fish' }),
    ).toBe('fish');
    expect(
      getSpeciesPixelIconFamily({ sourceCatalogId: 'F010', category: 'fish' }),
    ).toBe('fish');
  });

  it('assigns the same variant every time for the same species ID', () => {
    for (const sourceCatalogId of ['F001', 'F007', 'F008', 'F010', 'I087']) {
      const variants = Array.from({ length: 5 }, () =>
        getSpeciesPixelIconVariant(sourceCatalogId),
      );
      expect(new Set(variants)).toEqual(new Set([variants[0]]));
      expect(variants[0]).toBeGreaterThanOrEqual(0);
      expect(variants[0]).toBeLessThan(SPECIES_PIXEL_ICON_VARIANTS.length);
    }
  });

  it('uses a specific large-creature icon for known species only', () => {
    const otherInvertebrate = {
      sourceCatalogId: 'I087',
      category: 'other_invertebrate' as const,
    };
    const unknownOtherInvertebrate = {
      sourceCatalogId: 'I999',
      category: 'other_invertebrate' as const,
    };

    expect(getSpeciesPixelIconDefinition('large_creature', 0)).toBeDefined();
    expect(getSpeciesPixelIconFamily(otherInvertebrate)).toBeUndefined();
    expect(getSpeciesPixelIconDefinitionForSpecies(otherInvertebrate)).toMatchObject({
      id: 'species:I087',
      sourceCatalogId: 'I087',
      family: 'large_creature',
    });
    expect(
      getSpeciesPixelIconDefinitionForSpecies(unknownOtherInvertebrate),
    ).toBeUndefined();
  });
});
