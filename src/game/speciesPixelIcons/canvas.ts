import {
  SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT,
  type SpeciesPixelIconDefinition,
  type SpeciesPixelRect,
} from './model';

/** The small Canvas surface contract keeps rendering independent of the DOM. */
export interface SpeciesPixelCanvasContext {
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  // Canvas also permits gradients/patterns; the helper only assigns strings.
  fillStyle: unknown;
  globalAlpha: number;
  imageSmoothingEnabled: boolean;
}

export interface SpeciesPixelCanvasViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SpeciesPixelCanvasRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Converts a centered logical icon coordinate into a Canvas coordinate. */
export function speciesPixelRectToCanvasRect(
  rectangle: SpeciesPixelRect,
  viewport: SpeciesPixelCanvasViewport = SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT,
): SpeciesPixelCanvasRect {
  return {
    x: rectangle.x - viewport.x,
    y: rectangle.y - viewport.y,
    width: rectangle.width,
    height: rectangle.height,
  };
}

/** Converts a packed 0xRRGGBB icon color into a CSS Canvas fill color. */
export function speciesPixelColorToCss(color: number): string {
  const normalizedColor = Number.isFinite(color)
    ? Math.min(0xffffff, Math.max(0, Math.trunc(color)))
    : 0;
  return `#${normalizedColor.toString(16).padStart(6, '0')}`;
}

/** Clamps definition alpha to the range accepted by Canvas globalAlpha. */
export function speciesPixelAlphaToCanvasAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) {
    return 0;
  }

  return Math.min(1, Math.max(0, alpha));
}

/**
 * Renders a pixel icon definition into a Canvas 2D context.
 *
 * The logical viewport is centered at (0, 0) in the definition model. The
 * viewport origin is subtracted here so the same geometry is centered on the
 * intrinsic Canvas surface without requiring a DOM or a translation state.
 */
export function drawSpeciesPixelIconToCanvasContext(
  context: SpeciesPixelCanvasContext,
  definition: SpeciesPixelIconDefinition,
  viewport: SpeciesPixelCanvasViewport = SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT,
): void {
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, viewport.width, viewport.height);

  for (const rectangle of definition.rects) {
    const canvasRectangle = speciesPixelRectToCanvasRect(rectangle, viewport);
    context.fillStyle = speciesPixelColorToCss(rectangle.color);
    context.globalAlpha = speciesPixelAlphaToCanvasAlpha(rectangle.alpha);
    context.fillRect(
      canvasRectangle.x,
      canvasRectangle.y,
      canvasRectangle.width,
      canvasRectangle.height,
    );
  }

  // Do not leak a definition's alpha into later Canvas consumers.
  context.globalAlpha = 1;
}
