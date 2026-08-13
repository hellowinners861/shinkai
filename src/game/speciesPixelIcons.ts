/**
 * Compatibility entrypoint for the modular species pixel icon model.
 *
 * Keep existing consumers on this path while the implementation is split
 * across model, fallback definitions, registry, and renderer modules.
 */
export {
  SPECIES_PIXEL_ICON_FAMILIES,
  SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT,
  SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT_SIZE,
  SPECIES_PIXEL_ICON_REGULAR_FAMILIES,
  SPECIES_PIXEL_ICON_SIZE,
  SPECIES_PIXEL_ICON_VARIANTS,
  SPECIES_PIXEL_ICON_VIEWPORT,
  SPECIES_PIXEL_ICON_VIEWPORT_SIZE,
} from './speciesPixelIcons/model';

export type {
  SpeciesCatalogCategory,
  SpeciesPixelIconDefinition,
  SpeciesPixelIconFamily,
  SpeciesPixelIconRegularFamily,
  SpeciesPixelIconSpecies,
  SpeciesPixelIconVariant,
  SpeciesPixelRect,
} from './speciesPixelIcons/model';

export { SPECIES_PIXEL_ICON_DEFINITIONS } from './speciesPixelIcons/fallbackDefinitions';

export {
  drawSpeciesPixelIconToCanvasContext,
  speciesPixelAlphaToCanvasAlpha,
  speciesPixelColorToCss,
  speciesPixelRectToCanvasRect,
} from './speciesPixelIcons/canvas';

export type {
  SpeciesPixelCanvasContext,
  SpeciesPixelCanvasRect,
  SpeciesPixelCanvasViewport,
} from './speciesPixelIcons/canvas';

export {
  SLENDER_FISH_SOURCE_CATALOG_IDS,
  SPECIES_ICON_REGISTRY,
  SPECIES_PIXEL_ICON_FALLBACK_DEFINITIONS,
  SPECIES_PIXEL_ICON_REGISTRY,
  SPECIES_PIXEL_ICON_SPECIFIC_DEFINITIONS,
  buildSpeciesIconRegistry,
  buildSpeciesPixelIconRegistry,
  createSpeciesIconRegistry,
  getSpeciesPixelIconDefinition,
  getSpeciesPixelIconDefinitionForSpecies,
  getSpeciesPixelIconFamily,
  getSpeciesPixelIconVariant,
} from './speciesPixelIcons/registry';

export {
  drawSpeciesPixelIcon,
  renderSpeciesPixelIcon,
} from './speciesPixelIcons/renderer';
