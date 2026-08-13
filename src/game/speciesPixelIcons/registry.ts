import {
  SPECIES_PIXEL_ICON_DEFINITIONS,
} from './fallbackDefinitions';
import type {
  SpeciesPixelIconDefinition,
  SpeciesPixelIconFamily,
  SpeciesPixelIconRegularFamily,
  SpeciesPixelIconSpecies,
  SpeciesPixelIconVariant,
} from './model';
import {
  SPECIES_CEPHALOPOD_PIXEL_ICONS,
} from './species/cephalopods';
import { SPECIES_CRUSTACEAN_PIXEL_ICONS } from './species/crustaceans';
import { SPECIES_FISH_PIXEL_ICONS } from './species/fish';
import { SPECIES_GELATINOUS_PIXEL_ICONS } from './species/gelatinous';
import { SPECIES_OTHER_PIXEL_ICONS } from './species/other';

export const SLENDER_FISH_SOURCE_CATALOG_IDS = ['F001', 'F008'] as const;

export const SPECIES_PIXEL_ICON_SPECIFIC_DEFINITIONS: readonly SpeciesPixelIconDefinition[] = [
  ...SPECIES_FISH_PIXEL_ICONS,
  ...SPECIES_GELATINOUS_PIXEL_ICONS,
  ...SPECIES_CEPHALOPOD_PIXEL_ICONS,
  ...SPECIES_CRUSTACEAN_PIXEL_ICONS,
  ...SPECIES_OTHER_PIXEL_ICONS,
];

export const SPECIES_PIXEL_ICON_FALLBACK_DEFINITIONS =
  SPECIES_PIXEL_ICON_DEFINITIONS;

/**
 * Builds the ID registry and rejects duplicate definitions before a lookup can
 * silently choose one of them.
 */
export function buildSpeciesPixelIconRegistry(
  definitions: readonly SpeciesPixelIconDefinition[] = [
    ...SPECIES_PIXEL_ICON_FALLBACK_DEFINITIONS,
    ...SPECIES_PIXEL_ICON_SPECIFIC_DEFINITIONS,
  ],
): Map<string, SpeciesPixelIconDefinition> {
  const registry = new Map<string, SpeciesPixelIconDefinition>();
  for (const definition of definitions) {
    if (registry.has(definition.id)) {
      throw new Error(`Duplicate species pixel icon definition id: ${definition.id}`);
    }
    registry.set(definition.id, definition);
  }
  return registry;
}

/** Short aliases for callers that refer to the registry without "Pixel". */
export const buildSpeciesIconRegistry = buildSpeciesPixelIconRegistry;
export const createSpeciesIconRegistry = buildSpeciesPixelIconRegistry;

export const SPECIES_PIXEL_ICON_REGISTRY = buildSpeciesPixelIconRegistry();
export const SPECIES_ICON_REGISTRY = SPECIES_PIXEL_ICON_REGISTRY;

/** Maps catalog categories to the regular fallback icon families. */
export function getSpeciesPixelIconFamily(
  species: SpeciesPixelIconSpecies,
): SpeciesPixelIconRegularFamily | undefined {
  switch (species.category) {
    case 'fish':
      return SLENDER_FISH_SOURCE_CATALOG_IDS.includes(
        species.sourceCatalogId as (typeof SLENDER_FISH_SOURCE_CATALOG_IDS)[number],
      )
        ? 'slender_fish'
        : 'fish';
    case 'gelatinous_plankton':
      return 'gelatinous_plankton';
    case 'squid':
      return 'squid';
    case 'octopus':
      return 'octopus';
    case 'crab':
      return 'crab';
    case 'shrimp':
      return 'shrimp';
    case 'other_invertebrate':
      // large_creature is intentionally definition-only for now.
      return undefined;
    default:
      return undefined;
  }
}

/** Returns a stable 0–2 variant using only the species catalog ID. */
export function getSpeciesPixelIconVariant(
  sourceCatalogId: string,
): SpeciesPixelIconVariant {
  let hash = 0x811c9dc5;
  for (const character of sourceCatalogId.normalize('NFC')) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 3 as SpeciesPixelIconVariant;
}

/** Returns one family/variant fallback definition, including large_creature. */
export function getSpeciesPixelIconDefinition(
  family: SpeciesPixelIconFamily,
  variant: SpeciesPixelIconVariant,
): SpeciesPixelIconDefinition | undefined {
  return SPECIES_PIXEL_ICON_REGISTRY.get(`${family}-${String(variant)}`);
}

/** Resolves a species-specific icon before using the legacy fallback. */
export function getSpeciesPixelIconDefinitionForSpecies(
  species: SpeciesPixelIconSpecies,
): SpeciesPixelIconDefinition | undefined {
  const speciesSpecific = SPECIES_PIXEL_ICON_REGISTRY.get(
    `species:${species.sourceCatalogId}`,
  );
  if (speciesSpecific) {
    return speciesSpecific;
  }

  const family = getSpeciesPixelIconFamily(species);
  if (!family) {
    return undefined;
  }

  return getSpeciesPixelIconDefinition(
    family,
    getSpeciesPixelIconVariant(species.sourceCatalogId),
  );
}
