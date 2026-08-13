import catalogData from '../src/data/generated/speciesCatalog.json';
import { describe, expect, it } from 'vitest';

import {
  drawSpeciesPixelIconToCanvasContext,
  speciesPixelAlphaToCanvasAlpha,
  speciesPixelColorToCss,
  speciesPixelRectToCanvasRect,
} from '../src/game/speciesPixelIcons/canvas';
import { getSpeciesPixelIconDefinitionForSpecies } from '../src/game/speciesPixelIcons/registry';
import { SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT } from '../src/game/speciesPixelIcons/model';
import type {
  SpeciesPixelCanvasContext,
} from '../src/game/speciesPixelIcons/canvas';

type CatalogEntry = {
  source_catalog_id: string;
  category: string;
};

class RecordingCanvasContext implements SpeciesPixelCanvasContext {
  clearCalls: Array<[number, number, number, number]> = [];
  fillCalls: Array<{
    color: string;
    alpha: number;
    rectangle: [number, number, number, number];
  }> = [];
  fillStyle = '';
  globalAlpha = 1;
  imageSmoothingEnabled = true;

  clearRect(x: number, y: number, width: number, height: number): void {
    this.clearCalls.push([x, y, width, height]);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.fillCalls.push({
      color: this.fillStyle,
      alpha: this.globalAlpha,
      rectangle: [x, y, width, height],
    });
  }
}

const catalog = catalogData as readonly CatalogEntry[];

describe('species pixel icon Canvas renderer', () => {
  it('converts centered logical coordinates from the declared viewport', () => {
    expect(
      speciesPixelRectToCanvasRect({
        x: SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT.left,
        y: SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT.top,
        width: 4,
        height: 8,
        color: 0,
        alpha: 1,
      }),
    ).toEqual({ x: 0, y: 0, width: 4, height: 8 });
    expect(
      speciesPixelRectToCanvasRect({
        x: 0,
        y: 0,
        width: 4,
        height: 8,
        color: 0,
        alpha: 1,
      }),
    ).toEqual({ x: 32, y: 32, width: 4, height: 8 });
  });

  it('converts packed colors and clamps alpha for Canvas', () => {
    expect(speciesPixelColorToCss(0x0a1b2c)).toBe('#0a1b2c');
    expect(speciesPixelColorToCss(0xffffff)).toBe('#ffffff');
    expect(speciesPixelColorToCss(-1)).toBe('#000000');
    expect(speciesPixelAlphaToCanvasAlpha(-0.25)).toBe(0);
    expect(speciesPixelAlphaToCanvasAlpha(0.42)).toBe(0.42);
    expect(speciesPixelAlphaToCanvasAlpha(1.25)).toBe(1);
  });

  it('draws converted rectangles with nearest-neighbor-compatible settings', () => {
    const context = new RecordingCanvasContext();
    const definition = {
      id: 'species:test',
      sourceCatalogId: 'TEST',
      family: 'fish' as const,
      variant: 0 as const,
      rects: [
        {
          x: -4,
          y: 8,
          width: 4,
          height: 8,
          color: 0x123456,
          alpha: 0.5,
        },
      ],
    };

    drawSpeciesPixelIconToCanvasContext(context, definition);

    expect(context.imageSmoothingEnabled).toBe(false);
    expect(context.clearCalls).toEqual([[0, 0, 64, 64]]);
    expect(context.fillCalls).toEqual([
      {
        color: '#123456',
        alpha: 0.5,
        rectangle: [28, 40, 4, 8],
      },
    ]);
    expect(context.globalAlpha).toBe(1);
  });

  it('resolves every catalog entry by source_catalog_id', () => {
    for (const entry of catalog) {
      const definition = getSpeciesPixelIconDefinitionForSpecies({
        sourceCatalogId: entry.source_catalog_id,
        category: entry.category,
      });

      expect(definition?.sourceCatalogId).toBe(entry.source_catalog_id);
      expect(definition?.rects.length).toBeGreaterThan(0);
    }
  });
});
