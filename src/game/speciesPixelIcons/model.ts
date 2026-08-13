/**
 * Development-only species icons are drawn in a centered 64 × 64 logical
 * viewport. The current definitions use a smaller silhouette inside that
 * viewport so they can keep their existing geometry unchanged.
 */
export const SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT = {
  x: -32,
  y: -32,
  width: 64,
  height: 64,
  left: -32,
  top: -32,
  right: 32,
  bottom: 32,
} as const;

export const SPECIES_PIXEL_ICON_VIEWPORT =
  SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT;
export const SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT_SIZE = 64;
export const SPECIES_PIXEL_ICON_VIEWPORT_SIZE =
  SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT_SIZE;

export const SPECIES_PIXEL_ICON_FAMILIES = [
  'fish',
  'slender_fish',
  'gelatinous_plankton',
  'squid',
  'octopus',
  'crab',
  'shrimp',
  'large_creature',
] as const;

export type SpeciesPixelIconFamily =
  (typeof SPECIES_PIXEL_ICON_FAMILIES)[number];

export const SPECIES_PIXEL_ICON_REGULAR_FAMILIES = [
  'fish',
  'slender_fish',
  'gelatinous_plankton',
  'squid',
  'octopus',
  'crab',
  'shrimp',
] as const;

export type SpeciesPixelIconRegularFamily =
  (typeof SPECIES_PIXEL_ICON_REGULAR_FAMILIES)[number];

export const SPECIES_PIXEL_ICON_VARIANTS = [0, 1, 2] as const;
export type SpeciesPixelIconVariant =
  (typeof SPECIES_PIXEL_ICON_VARIANTS)[number];

/** Existing nominal draw size kept for consumers of the original module. */
export const SPECIES_PIXEL_ICON_SIZE = 48;

export type SpeciesCatalogCategory =
  | 'fish'
  | 'gelatinous_plankton'
  | 'squid'
  | 'octopus'
  | 'crab'
  | 'shrimp'
  | 'other_invertebrate';

export interface SpeciesPixelIconSpecies {
  sourceCatalogId: string;
  category: string;
}

export interface SpeciesPixelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: number;
  readonly alpha: number;
}

export interface SpeciesPixelIconDefinition {
  readonly id: string;
  /** Present only for a species-specific definition. */
  readonly sourceCatalogId?: string;
  readonly family: SpeciesPixelIconFamily;
  readonly variant: SpeciesPixelIconVariant;
  readonly rects: readonly SpeciesPixelRect[];
}
