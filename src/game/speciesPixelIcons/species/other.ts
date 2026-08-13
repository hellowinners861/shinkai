import type { SpeciesPixelIconDefinition } from '../model';
import { defineSpeciesIcon, rect } from '../primitives';

export const SPECIES_OTHER_PIXEL_ICONS: readonly SpeciesPixelIconDefinition[] = [
  // I085 — Bathymodiolus thermophilus; elongated ribbed shell and a short byssal foot.
  defineSpeciesIcon('I085', 'large_creature', 0, [
    rect(-28, -12, 36, 4, 'blackBrown'), rect(-28, -8, 40, 12, 'dark'),
    rect(-24, 4, 32, 4, 'blackBrown'), rect(-28, -4, 4, 8, 'shadow'),
    rect(-20, -4, 4, 12, 'purple'), rect(-12, -4, 4, 12, 'shadow'),
    rect(-4, -4, 4, 12, 'purple'), rect(4, -4, 4, 12, 'shadow'),
    rect(12, -4, 4, 8, 'purple'), rect(-20, -8, 4, 4, 'silverBlue'),
    rect(-8, -12, 4, 4, 'accent'), rect(12, 4, 8, 4, 'dark'),
    rect(-4, 12, 12, 4, 'accent'),
  ]),

  // I086 — Riftia pachyptila; long segmented tube and a broad branched plume.
  defineSpeciesIcon('I086', 'large_creature', 1, [
    rect(-12, 24, 24, 4, 'shadow'), rect(-10, 0, 4, 24, 'shadow'),
    rect(6, 0, 4, 24, 'shadow'), rect(-6, 0, 12, 24, 'ivory'),
    rect(-6, 4, 12, 4, 'accent'), rect(-6, 12, 12, 4, 'accent'),
    rect(-6, 20, 12, 4, 'accent'), rect(-8, -8, 16, 8, 'ivory'),
    rect(-12, -16, 24, 8, 'magenta'), rect(-20, -20, 8, 4, 'magenta'),
    rect(-24, -24, 8, 4, 'warning'), rect(12, -20, 8, 4, 'magenta'),
    rect(16, -24, 8, 4, 'warning'), rect(-4, -24, 8, 4, 'highlight'),
    rect(-16, -16, 4, 8, 'magenta'), rect(12, -16, 4, 8, 'magenta'),
  ]),

  // I087 — Lamellibrachia luymesi; thin offset tube and a compact four-lobed plume.
  defineSpeciesIcon('I087', 'large_creature', 2, [
    rect(-6, 24, 16, 4, 'shadow'), rect(0, 8, 8, 16, 'pale'),
    rect(4, 8, 4, 16, 'highlight'), rect(-4, -8, 8, 16, 'ivory'),
    rect(0, -20, 8, 12, 'pale'), rect(4, -16, 4, 12, 'shadow'),
    rect(0, 16, 8, 4, 'accent'), rect(-4, 0, 8, 4, 'accent'),
    rect(0, -4, 8, 4, 'accent'), rect(-8, -12, 4, 4, 'magenta'),
    rect(8, -12, 4, 4, 'magenta'), rect(-4, -16, 8, 4, 'warning'),
    rect(0, -24, 8, 4, 'highlight'),
  ]),

  // I088 — Escarpia laminata; extra-long narrow tube, flared base, and a tiny side plume.
  defineSpeciesIcon('I088', 'large_creature', 0, [
    rect(-12, 24, 20, 4, 'ivory'), rect(-8, 20, 16, 4, 'pale'),
    rect(-4, 8, 8, 12, 'pale'), rect(0, 8, 4, 12, 'highlight'),
    rect(-4, -8, 8, 16, 'ivory'), rect(-8, -20, 8, 12, 'pale'),
    rect(-8, -16, 4, 12, 'shadow'), rect(-4, 16, 8, 4, 'accent'),
    rect(-4, 0, 8, 4, 'accent'), rect(-8, -12, 8, 4, 'accent'),
    rect(-12, -24, 8, 4, 'magenta'), rect(-4, -28, 8, 4, 'warning'),
    rect(4, -24, 8, 4, 'magenta'), rect(0, -24, 4, 8, 'highlight'),
  ]),

  // I089 — Enypniastes eximia; elongated translucent body with webbed swimming fins.
  defineSpeciesIcon('I089', 'large_creature', 1, [
    rect(-20, -12, 32, 4, 'purple', 0.8), rect(-24, -8, 40, 16, 'magenta', 0.75),
    rect(-20, 8, 32, 4, 'pale', 0.75), rect(-16, -4, 28, 8, 'highlight', 0.65),
    rect(16, -4, 8, 8, 'purple', 0.75), rect(-24, -4, 8, 8, 'accent', 0.7),
    rect(-20, -20, 8, 8, 'magenta', 0.6), rect(-12, -24, 8, 8, 'highlight', 0.55),
    rect(0, -20, 8, 8, 'magenta', 0.6), rect(-20, 12, 8, 8, 'magenta', 0.6),
    rect(-8, 16, 8, 8, 'highlight', 0.55), rect(4, 12, 8, 8, 'magenta', 0.6),
    rect(-12, -8, 4, 16, 'accent', 0.7), rect(0, -8, 4, 16, 'accent', 0.7),
    rect(8, -8, 4, 16, 'accent', 0.7), rect(-20, -4, 4, 4, 'warning', 0.9),
    rect(20, -12, 4, 4, 'highlight', 0.8),
  ]),

  // I090 — Psychropotes longicauda; flattened body with a stepped dorsal sail and tail.
  defineSpeciesIcon('I090', 'large_creature', 2, [
    rect(-24, -8, 40, 12, 'purple', 0.85), rect(-20, -12, 32, 4, 'blackBrown', 0.9),
    rect(-20, 4, 32, 4, 'pale', 0.75), rect(-12, 0, 24, 4, 'highlight', 0.7),
    rect(16, -4, 8, 8, 'purple', 0.85), rect(-24, -4, 4, 8, 'magenta', 0.8),
    rect(0, -20, 4, 12, 'accent'), rect(4, -24, 8, 4, 'magenta'),
    rect(8, -28, 12, 4, 'magenta'), rect(16, -24, 8, 4, 'warning'),
    rect(12, -20, 8, 4, 'accent'), rect(-16, 8, 4, 8, 'accent'),
    rect(-4, 8, 4, 12, 'pale'), rect(8, 8, 4, 8, 'accent'),
    rect(-12, -16, 4, 4, 'warning'), rect(20, 8, 4, 4, 'highlight'),
    rect(-20, -4, 4, 4, 'dark'),
  ]),

  // I091 — Scotoplanes globosa; globose body, dorsal papillae, and six walking tube feet.
  defineSpeciesIcon('I091', 'large_creature', 0, [
    rect(-8, -16, 16, 4, 'purple', 0.85), rect(-16, -12, 32, 4, 'magenta', 0.85),
    rect(-20, -8, 40, 16, 'magenta', 0.8), rect(-16, 8, 32, 4, 'pale', 0.8),
    rect(-8, 12, 16, 4, 'highlight', 0.8), rect(-24, -4, 4, 8, 'magenta', 0.8),
    rect(16, -4, 8, 8, 'purple', 0.8), rect(-16, -20, 4, 8, 'warning'),
    rect(-4, -20, 4, 8, 'accent'), rect(8, -20, 4, 8, 'warning'),
    rect(16, -16, 4, 4, 'accent'), rect(-20, 12, 4, 12, 'accent'),
    rect(-12, 16, 4, 12, 'pale'), rect(-4, 16, 4, 8, 'accent'),
    rect(4, 16, 4, 12, 'pale'), rect(12, 16, 4, 8, 'accent'),
    rect(20, 12, 4, 12, 'pale'), rect(16, -4, 4, 4, 'dark'),
  ]),

  // I092 — Euplectella aspergillum; cylindrical silica lattice and projecting spicules.
  defineSpeciesIcon('I092', 'large_creature', 1, [
    rect(-12, -28, 24, 4, 'silverBlue'), rect(-16, -24, 4, 16, 'silverBlue'),
    rect(12, -24, 4, 16, 'highlight'), rect(-20, -8, 4, 20, 'highlight'),
    rect(16, -8, 4, 20, 'silverBlue'), rect(-16, 12, 4, 12, 'silverBlue'),
    rect(12, 12, 4, 12, 'highlight'), rect(-12, 24, 24, 4, 'pale'),
    rect(-8, -24, 4, 12, 'accent'), rect(4, -24, 4, 12, 'accent'),
    rect(-12, -16, 24, 4, 'pale'), rect(-16, -4, 32, 4, 'accent'),
    rect(-16, 8, 32, 4, 'pale'), rect(-12, 20, 24, 4, 'accent'),
    rect(-8, -4, 4, 16, 'silverBlue'), rect(4, -4, 4, 16, 'silverBlue'),
    rect(-20, -28, 4, 4, 'highlight'), rect(16, -28, 4, 4, 'accent'),
  ]),
] as const;
