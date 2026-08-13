import {
  SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT,
  type SpeciesPixelIconDefinition,
  type SpeciesPixelIconFamily,
  type SpeciesPixelIconVariant,
  type SpeciesPixelRect,
} from './model';
import { PIXEL_COLORS, type PixelTone } from './palette';

export function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  tone: PixelTone,
  alpha = 1,
): SpeciesPixelRect {
  return {
    x,
    y,
    width,
    height,
    color: PIXEL_COLORS[tone],
    alpha,
  };
}

function assertGeometry(
  rectangles: readonly SpeciesPixelRect[],
  enforceViewport: boolean,
): void {
  for (const rectangle of rectangles) {
    if (
      !Number.isFinite(rectangle.x) ||
      !Number.isFinite(rectangle.y) ||
      !Number.isFinite(rectangle.width) ||
      !Number.isFinite(rectangle.height) ||
      rectangle.width <= 0 ||
      rectangle.height <= 0
    ) {
      throw new Error('Species pixel icon rectangles must have positive finite geometry');
    }

    if (
      enforceViewport &&
      (
        rectangle.x < SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT.left ||
        rectangle.y < SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT.top ||
        rectangle.x + rectangle.width > SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT.right ||
        rectangle.y + rectangle.height > SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT.bottom
      )
    ) {
      throw new Error('Species pixel icon rectangle is outside the 64x64 logical viewport');
    }

    if (!Number.isFinite(rectangle.color) || rectangle.alpha < 0 || rectangle.alpha > 1) {
      throw new Error('Species pixel icon rectangles must use valid color and alpha values');
    }
  }
}

/**
 * Defines a species-specific icon. sourceCatalogId is deliberately required
 * so every future species definition gets a stable, collision-detectable ID.
 */
export function defineSpeciesIcon(
  sourceCatalogId: string,
  family: SpeciesPixelIconFamily,
  variant: SpeciesPixelIconVariant,
  rectangles: readonly SpeciesPixelRect[],
): SpeciesPixelIconDefinition {
  if (sourceCatalogId.trim().length === 0) {
    throw new Error('Species pixel icon sourceCatalogId must not be empty');
  }

  // Species-specific silhouettes may intentionally use elongated tentacles,
  // antennae, or limbs beyond the compact fallback viewport.
  assertGeometry(rectangles, false);
  return {
    id: `species:${sourceCatalogId}`,
    sourceCatalogId,
    family,
    variant,
    rects: rectangles,
  };
}

/** Defines one of the original family/variant fallback silhouettes. */
export function defineFallbackIcon(
  family: SpeciesPixelIconFamily,
  variant: SpeciesPixelIconVariant,
  rectangles: readonly SpeciesPixelRect[],
): SpeciesPixelIconDefinition {
  assertGeometry(rectangles, true);
  return {
    id: `${family}-${String(variant)}`,
    family,
    variant,
    rects: rectangles,
  };
}

export const defineIcon = defineFallbackIcon;
