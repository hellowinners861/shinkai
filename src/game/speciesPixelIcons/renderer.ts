import type Phaser from 'phaser';

import type { SpeciesPixelIconDefinition } from './model';

/** Draws a definition as crisp filled rectangles on a Phaser Graphics object. */
export function drawSpeciesPixelIcon(
  graphics: Phaser.GameObjects.Graphics,
  definition: SpeciesPixelIconDefinition,
): void {
  graphics.clear();
  for (const rectangle of definition.rects) {
    graphics.fillStyle(rectangle.color, rectangle.alpha);
    graphics.fillRect(
      rectangle.x,
      rectangle.y,
      rectangle.width,
      rectangle.height,
    );
  }
}

export const renderSpeciesPixelIcon = drawSpeciesPixelIcon;
