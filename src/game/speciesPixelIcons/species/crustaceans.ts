import type { SpeciesPixelIconDefinition } from '../model';
import { defineSpeciesIcon, rect } from '../primitives';

/**
 * Species-specific development silhouettes for the crustacean catalog.
 *
 * Crabs are frontal, seafloor forms, while shrimps are lateral, swimming
 * forms. Vent taxa retain a dark heat-source core and red/warning accents;
 * pelagic taxa use segmented, translucent bodies and long antennae.
 */
export const SPECIES_CRUSTACEAN_PIXEL_ICONS: readonly SpeciesPixelIconDefinition[] = [
  // I053 — Neolithodes diomedeae / Pacific king crab; broad spiny lithodid shell.
  defineSpeciesIcon('I053', 'crab', 0, [
    rect(-12, -24, 24, 4, 'accent'), rect(-18, -20, 36, 4, 'shadow'), rect(-24, -16, 48, 12, 'body'),
    rect(-20, -4, 40, 4, 'highlight'), rect(-28, -12, 4, 4, 'warning'), rect(24, -12, 4, 4, 'warning'),
    rect(-8, -28, 4, 4, 'warning'), rect(4, -28, 4, 4, 'warning'), rect(-32, -8, 8, 4, 'body'),
    rect(24, -8, 8, 4, 'body'), rect(-32, 0, 8, 4, 'accent'), rect(24, 0, 8, 4, 'accent'),
    rect(-24, 8, 4, 20, 'accent'), rect(-12, 8, 4, 24, 'body'), rect(8, 8, 4, 24, 'body'),
    rect(20, 8, 4, 20, 'accent'), rect(-8, -8, 4, 4, 'dark'), rect(4, -8, 4, 4, 'dark'),
  ]),

  // I054 — Neolithodes grimaldii / deep-sea king crab; tall porcupine profile.
  defineSpeciesIcon('I054', 'crab', 1, [
    rect(-8, -28, 16, 4, 'accent'), rect(-14, -24, 28, 4, 'warning'), rect(-18, -20, 36, 4, 'shadow'),
    rect(-22, -16, 44, 16, 'body'), rect(-16, 0, 32, 4, 'highlight'), rect(-28, -12, 4, 4, 'warning'),
    rect(24, -12, 4, 4, 'warning'), rect(-8, -32, 4, 4, 'warning'), rect(4, -32, 4, 4, 'warning'),
    rect(-36, -8, 8, 4, 'accent'), rect(28, -8, 8, 4, 'accent'), rect(-28, 8, 4, 24, 'accent'),
    rect(-16, 8, 4, 28, 'body'), rect(12, 8, 4, 28, 'body'), rect(24, 8, 4, 24, 'accent'),
    rect(-8, -8, 4, 8, 'dark'), rect(4, -8, 4, 8, 'dark'),
  ]),

  // I055 — Paralomis multispina / spiny king crab; four dorsal spines and side spines.
  defineSpeciesIcon('I055', 'crab', 2, [
    rect(-16, -20, 32, 4, 'shadow'), rect(-20, -16, 40, 4, 'body'), rect(-24, -12, 48, 12, 'body'),
    rect(-18, 0, 36, 4, 'highlight'), rect(-12, -24, 4, 4, 'warning'), rect(-4, -24, 4, 4, 'warning'),
    rect(4, -24, 4, 4, 'warning'), rect(12, -24, 4, 4, 'warning'), rect(-28, -12, 4, 4, 'warning'),
    rect(24, -12, 4, 4, 'warning'), rect(-32, -8, 8, 4, 'accent'), rect(24, -8, 8, 4, 'accent'),
    rect(-24, 8, 4, 20, 'body'), rect(-12, 8, 4, 24, 'accent'), rect(8, 8, 4, 24, 'accent'),
    rect(20, 8, 4, 20, 'body'), rect(-8, -4, 4, 4, 'dark'), rect(4, -4, 4, 4, 'dark'),
  ]),

  // I056 — Paralomis birsteini / king crab; compact, smooth tiered shell.
  defineSpeciesIcon('I056', 'crab', 0, [
    rect(-10, -16, 20, 4, 'silverBlue'), rect(-18, -12, 36, 4, 'shadow'), rect(-22, -8, 44, 12, 'body'),
    rect(-18, 4, 36, 4, 'highlight'), rect(-14, -20, 4, 4, 'accent'), rect(10, -20, 4, 4, 'accent'),
    rect(-6, -22, 4, 4, 'warning'), rect(-30, -8, 10, 8, 'accent'), rect(20, -8, 12, 4, 'accent'),
    rect(-30, 0, 10, 4, 'body'), rect(20, 0, 12, 4, 'body'), rect(-20, 8, 4, 16, 'body'),
    rect(-8, 8, 4, 20, 'accent'), rect(8, 8, 4, 20, 'accent'), rect(20, 8, 4, 16, 'body'),
    rect(-8, -4, 4, 4, 'dark'), rect(4, -4, 4, 4, 'dark'), rect(-4, 4, 8, 4, 'silverBlue'),
  ]),

  // I057 — Chaceon quinquedens / Atlantic deep-sea red crab; broad red carapace.
  defineSpeciesIcon('I057', 'crab', 1, [
    rect(-14, -16, 28, 4, 'dark'), rect(-20, -12, 40, 4, 'magenta'), rect(-24, -8, 48, 12, 'magenta'),
    rect(-20, 4, 40, 4, 'warning'), rect(-12, 8, 24, 4, 'dark'), rect(-32, -12, 12, 8, 'magenta'),
    rect(-32, -4, 12, 4, 'warning'), rect(20, -12, 12, 8, 'magenta'), rect(20, -4, 12, 4, 'warning'),
    rect(-24, 8, 4, 12, 'magenta'), rect(-12, 8, 4, 16, 'dark'), rect(8, 8, 4, 16, 'dark'),
    rect(20, 8, 4, 12, 'magenta'), rect(-8, -4, 4, 8, 'dark'), rect(4, -4, 4, 8, 'dark'), rect(-4, 0, 8, 4, 'highlight'),
  ]),

  // I058 — Chaceon affinis / golden deep-sea crab; flatter gold crown and tiers.
  defineSpeciesIcon('I058', 'crab', 2, [
    rect(-12, -18, 24, 4, 'shadow'), rect(-20, -14, 40, 4, 'warning'), rect(-24, -10, 48, 12, 'yellow'),
    rect(-22, 2, 44, 4, 'warning'), rect(-14, 6, 28, 4, 'highlight'), rect(-32, -8, 12, 8, 'yellow'),
    rect(-32, 0, 12, 4, 'warning'), rect(20, -8, 12, 8, 'yellow'), rect(20, 0, 12, 4, 'warning'),
    rect(-20, 8, 4, 12, 'warning'), rect(-8, 8, 4, 16, 'yellow'), rect(8, 8, 4, 16, 'shadow'),
    rect(20, 8, 4, 12, 'warning'), rect(-8, -4, 4, 4, 'dark'), rect(4, -4, 4, 4, 'dark'),
  ]),

  // I059 — Geryon trispinosus / three-spined crab; three top spines and smaller shell.
  defineSpeciesIcon('I059', 'crab', 0, [
    rect(-8, -20, 4, 4, 'warning'), rect(0, -24, 4, 4, 'warning'), rect(8, -20, 4, 4, 'warning'),
    rect(-16, -16, 32, 4, 'shadow'), rect(-20, -12, 40, 16, 'body'), rect(-16, 4, 32, 4, 'highlight'),
    rect(-24, -8, 4, 4, 'accent'), rect(20, -8, 4, 4, 'accent'), rect(-32, -8, 8, 4, 'accent'),
    rect(24, -8, 8, 4, 'accent'), rect(-32, 0, 8, 4, 'body'), rect(24, 0, 8, 4, 'body'),
    rect(-28, 4, 4, 20, 'accent'), rect(20, 4, 4, 20, 'accent'), rect(-12, 8, 4, 16, 'body'),
    rect(8, 8, 4, 16, 'body'), rect(-8, -4, 4, 4, 'dark'), rect(4, -4, 4, 4, 'dark'),
  ]),

  // I060 — Cyrtomaia suhmii / spider crab; narrow body and widely flared legs.
  defineSpeciesIcon('I060', 'crab', 1, [
    rect(-6, -24, 12, 4, 'accent'), rect(-10, -20, 20, 4, 'shadow'), rect(-14, -16, 28, 4, 'accent'),
    rect(-18, -12, 36, 12, 'body'), rect(-12, 0, 24, 4, 'highlight'), rect(-2, -32, 4, 8, 'warning'),
    rect(-6, -28, 4, 4, 'warning'), rect(-8, -8, 4, 4, 'dark'), rect(4, -8, 4, 4, 'dark'),
    rect(-30, -12, 8, 4, 'accent'), rect(22, -12, 8, 4, 'accent'), rect(-30, -4, 12, 4, 'body'),
    rect(18, -4, 12, 4, 'body'), rect(-28, 4, 4, 20, 'accent'), rect(-16, 4, 4, 28, 'body'),
    rect(12, 4, 4, 28, 'body'), rect(24, 4, 4, 20, 'accent'), rect(-4, 4, 8, 4, 'highlight'),
  ]),
  // I061 — Macroregonia macrochira / deep-sea spider crab; oversized long claw.
  defineSpeciesIcon('I061', 'crab', 2, [
    rect(-8, -20, 16, 4, 'shadow'), rect(-12, -16, 24, 4, 'accent'), rect(-16, -12, 32, 12, 'body'), rect(-10, 0, 20, 4, 'highlight'), rect(-6, -8, 4, 4, 'dark'), rect(2, -8, 4, 4, 'dark'),
    rect(-28, -16, 12, 8, 'body'), rect(-28, -8, 8, 4, 'warning'), rect(16, -16, 12, 8, 'body'), rect(20, -8, 8, 4, 'warning'),
    rect(-24, -4, 8, 4, 'accent'), rect(16, -4, 8, 4, 'accent'), rect(-28, 4, 12, 4, 'body'), rect(16, 4, 12, 4, 'body'),
    rect(-24, 12, 8, 4, 'accent'), rect(16, 12, 8, 4, 'accent'), rect(-20, 20, 12, 4, 'body'), rect(8, 20, 12, 4, 'body'),
  ]),

  // I062 — Dorhynchus thomsoni / long-legged spider crab; pointed crown and legs to the edge.
  defineSpeciesIcon('I062', 'crab', 0, [
    rect(-8, -24, 16, 4, 'accent'), rect(-4, -28, 8, 4, 'warning'), rect(-10, -20, 20, 4, 'shadow'), rect(-14, -16, 28, 12, 'body'), rect(-10, -4, 20, 4, 'highlight'), rect(-6, -12, 4, 4, 'dark'), rect(2, -12, 4, 4, 'dark'),
    rect(-28, -16, 12, 4, 'accent'), rect(16, -16, 12, 4, 'accent'), rect(-32, -8, 12, 4, 'body'), rect(20, -8, 12, 4, 'body'), rect(-32, 0, 12, 4, 'accent'), rect(20, 0, 12, 4, 'accent'),
    rect(-28, 8, 8, 4, 'body'), rect(20, 8, 8, 4, 'body'), rect(-24, 16, 8, 4, 'accent'), rect(16, 16, 8, 4, 'accent'), rect(-28, 24, 8, 4, 'body'), rect(20, 24, 8, 4, 'body'),
  ]),

  // I063 — Kiwa tyleri / Hoff crab; dense vent setae and dark heat-facing core.
  defineSpeciesIcon('I063', 'crab', 1, [
    rect(-12, -16, 24, 4, 'shadow'), rect(-18, -12, 36, 16, 'pale'), rect(-14, 4, 28, 4, 'ivory'), rect(-4, -4, 8, 8, 'dark'), rect(-8, -8, 4, 4, 'dark'), rect(4, -8, 4, 4, 'dark'),
    rect(-28, -16, 8, 8, 'ivory'), rect(-28, -4, 8, 4, 'highlight'), rect(20, -16, 8, 8, 'ivory'), rect(20, -4, 8, 4, 'highlight'),
    rect(-24, -20, 4, 4, 'accent'), rect(-16, -20, 4, 4, 'accent'), rect(12, -20, 4, 4, 'accent'), rect(20, -20, 4, 4, 'accent'),
    rect(-24, 8, 4, 12, 'pale'), rect(-12, 8, 4, 16, 'ivory'), rect(8, 8, 4, 16, 'ivory'), rect(20, 8, 4, 12, 'pale'), rect(-4, -24, 8, 4, 'warning'), rect(-20, 8, 4, 4, 'highlight'),
  ]),

  // I064 — Kiwa hirsuta / Yeti crab; long shaggy chelae and hanging setose legs.
  defineSpeciesIcon('I064', 'crab', 2, [
    rect(-10, -16, 20, 4, 'shadow'), rect(-16, -12, 32, 12, 'pale'), rect(-12, 0, 24, 4, 'ivory'), rect(-6, -8, 4, 4, 'dark'), rect(2, -8, 4, 4, 'dark'),
    rect(-28, -16, 8, 4, 'ivory'), rect(-28, -12, 8, 4, 'highlight'), rect(-28, -8, 8, 4, 'accent'), rect(20, -16, 8, 4, 'ivory'), rect(20, -12, 8, 4, 'highlight'), rect(20, -8, 8, 4, 'accent'),
    rect(-24, 4, 4, 16, 'ivory'), rect(-16, 4, 4, 20, 'accent'), rect(-8, 4, 4, 16, 'ivory'), rect(8, 4, 4, 16, 'ivory'), rect(16, 4, 4, 20, 'accent'), rect(24, 4, 4, 16, 'ivory'),
    rect(-20, 20, 4, 4, 'highlight'), rect(16, 20, 4, 4, 'highlight'), rect(-4, -20, 8, 4, 'warning'),
  ]),

  // I065 — Bythograea thermydron / hydrothermal vent crab; heavy red shell and hot core.
  defineSpeciesIcon('I065', 'crab', 0, [
    rect(-16, -16, 32, 4, 'dark'), rect(-20, -12, 40, 16, 'magenta'), rect(-16, 4, 32, 4, 'warning'), rect(-4, -4, 8, 8, 'dark'), rect(-8, -8, 4, 4, 'warning'), rect(4, -8, 4, 4, 'warning'),
    rect(-28, -12, 8, 8, 'magenta'), rect(-28, -4, 8, 4, 'warning'), rect(20, -12, 8, 8, 'magenta'), rect(20, -4, 8, 4, 'warning'),
    rect(-24, 8, 4, 16, 'magenta'), rect(-16, 8, 4, 12, 'warning'), rect(-8, 8, 4, 16, 'magenta'), rect(8, 8, 4, 16, 'magenta'), rect(16, 8, 4, 12, 'warning'), rect(24, 8, 4, 16, 'magenta'),
    rect(-4, -20, 8, 4, 'warning'), rect(-20, 8, 4, 4, 'highlight'),
  ]),

  // I066 — Segonzacia mesatlantica / vent crab; pale shell, red rim, long red legs.
  defineSpeciesIcon('I066', 'crab', 1, [
    rect(-8, -20, 16, 4, 'warning'), rect(-14, -16, 28, 4, 'magenta'), rect(-18, -12, 36, 12, 'pale'), rect(-14, 0, 28, 4, 'magenta'), rect(-4, -8, 8, 8, 'dark'), rect(-8, -4, 4, 4, 'warning'), rect(4, -4, 4, 4, 'warning'),
    rect(-28, -12, 8, 4, 'magenta'), rect(-28, -4, 8, 4, 'warning'), rect(20, -12, 8, 4, 'magenta'), rect(20, -4, 8, 4, 'warning'),
    rect(-24, 4, 4, 12, 'accent'), rect(-16, 4, 4, 16, 'magenta'), rect(12, 4, 4, 16, 'magenta'), rect(20, 4, 4, 12, 'accent'), rect(-4, -24, 8, 4, 'warning'), rect(-24, 16, 4, 4, 'highlight'), rect(20, 16, 4, 4, 'highlight'),
  ]),

  // I067 — Homola barbata / carrier crab; raised carried object above shell.
  defineSpeciesIcon('I067', 'crab', 2, [
    rect(-8, -24, 16, 4, 'pale'), rect(-12, -20, 24, 4, 'shadow'), rect(-14, -16, 28, 12, 'body'), rect(-10, -4, 20, 4, 'highlight'), rect(-6, -8, 4, 4, 'dark'), rect(2, -8, 4, 4, 'dark'),
    rect(-8, -20, 4, 8, 'accent'), rect(4, -20, 4, 8, 'accent'), rect(-24, -8, 8, 4, 'accent'), rect(16, -8, 8, 4, 'accent'), rect(-24, 0, 4, 12, 'body'), rect(20, 0, 4, 12, 'body'),
    rect(-20, 8, 4, 16, 'accent'), rect(16, 8, 4, 16, 'accent'), rect(-12, 8, 4, 12, 'body'), rect(8, 8, 4, 12, 'body'),
  ]),

  // I068 — Ethusina abyssicola / deep-sea crab; flattened box-like carapace.
  defineSpeciesIcon('I068', 'crab', 0, [
    rect(-12, -16, 24, 4, 'shadow'), rect(-20, -12, 40, 4, 'accent'), rect(-24, -8, 48, 12, 'body'), rect(-20, 4, 40, 4, 'highlight'), rect(-16, 8, 32, 4, 'shadow'),
    rect(-28, -8, 8, 4, 'body'), rect(-28, 0, 8, 4, 'accent'), rect(20, -8, 8, 4, 'body'), rect(20, 0, 8, 4, 'accent'),
    rect(-24, 8, 4, 8, 'body'), rect(-16, 8, 4, 12, 'accent'), rect(12, 8, 4, 12, 'accent'), rect(20, 8, 4, 8, 'body'), rect(-8, -4, 4, 4, 'dark'), rect(4, -4, 4, 4, 'dark'), rect(-4, -12, 8, 4, 'highlight'),
  ]),

  // I069 — Rimicaris exoculata / vent shrimp; enlarged cephalothorax and dorsal eye.
  defineSpeciesIcon('I069', 'shrimp', 0, [
    rect(-16, -12, 20, 16, 'magenta', 0.8), rect(-12, -16, 12, 4, 'accent', 0.7), rect(-8, -20, 8, 4, 'warning'), rect(-20, -8, 8, 4, 'highlight', 0.75),
    rect(-30, -16, 14, 2, 'accent', 0.65), rect(-30, -12, 18, 2, 'highlight', 0.55), rect(-12, 4, 16, 4, 'dark'), rect(-4, 4, 8, 8, 'warning'),
    rect(4, -8, 8, 8, 'magenta', 0.75), rect(12, -6, 8, 8, 'magenta', 0.7), rect(20, -4, 8, 8, 'magenta', 0.65), rect(4, 0, 8, 8, 'accent', 0.55), rect(12, 2, 8, 8, 'accent', 0.5), rect(20, 4, 8, 4, 'highlight', 0.65),
    rect(24, -8, 4, 4, 'warning'), rect(24, 8, 4, 4, 'warning'), rect(-24, 0, 8, 4, 'body', 0.55), rect(-20, 8, 4, 4, 'warning'), rect(0, -24, 4, 4, 'warning'),
  ]),

  // I070 — Alvinocaris markensis / vent shrimp; slender vent body and red abdomen.
  defineSpeciesIcon('I070', 'shrimp', 1, [
    rect(-14, -12, 16, 12, 'pale', 0.75), rect(-12, -16, 12, 4, 'accent', 0.65), rect(-20, -8, 8, 4, 'warning'),
    rect(-30, -16, 14, 2, 'highlight', 0.6), rect(-28, -12, 16, 2, 'accent', 0.6), rect(-10, 0, 12, 4, 'dark'),
    rect(-2, -8, 8, 8, 'magenta', 0.7), rect(6, -6, 8, 8, 'magenta', 0.65), rect(14, -4, 8, 8, 'magenta', 0.6), rect(22, -2, 6, 6, 'magenta', 0.55),
    rect(-2, 4, 8, 4, 'warning'), rect(6, 2, 8, 4, 'warning'), rect(20, 4, 8, 4, 'accent', 0.6), rect(24, -8, 4, 4, 'warning'), rect(24, 8, 4, 4, 'warning'),
    rect(-18, 4, 4, 8, 'pale'), rect(-10, 8, 4, 8, 'accent'),
  ]),

  // I071 — Mirocaris fortunata / vent shrimp; compact glowing head and bent tail.
  defineSpeciesIcon('I071', 'shrimp', 2, [
    rect(-14, -12, 18, 16, 'body', 0.75), rect(-18, -8, 6, 8, 'accent', 0.65), rect(-12, -16, 12, 4, 'shadow'), rect(-24, -8, 8, 4, 'warning'),
    rect(-32, -20, 16, 2, 'highlight', 0.55), rect(-30, -16, 20, 2, 'accent', 0.55), rect(-8, 4, 8, 4, 'dark'),
    rect(-2, -8, 8, 8, 'magenta', 0.8), rect(6, -8, 8, 8, 'magenta', 0.7), rect(14, -6, 8, 8, 'magenta', 0.65), rect(20, 0, 8, 8, 'magenta', 0.55), rect(22, 8, 6, 4, 'accent', 0.65),
    rect(24, -8, 4, 4, 'warning'), rect(24, 12, 4, 4, 'warning'), rect(-18, 4, 4, 8, 'warning'), rect(-10, 8, 4, 8, 'accent'), rect(0, 8, 4, 8, 'warning'), rect(-4, -20, 8, 4, 'warning'),
  ]),

  // I072 — Acanthephyra purpurea / purple glass shrimp; purple transparent shell.
  defineSpeciesIcon('I072', 'shrimp', 0, [
    rect(-16, -12, 16, 12, 'purple', 0.65), rect(-12, -16, 12, 4, 'purple', 0.55), rect(-22, -8, 8, 4, 'accent', 0.45),
    rect(-30, -16, 14, 2, 'highlight', 0.45), rect(-30, -12, 18, 2, 'accent', 0.4), rect(-4, -8, 8, 8, 'silverBlue', 0.45), rect(4, -6, 8, 8, 'purple', 0.45), rect(12, -4, 8, 8, 'silverBlue', 0.4), rect(20, -2, 8, 6, 'purple', 0.4),
    rect(24, -10, 4, 4, 'highlight', 0.75), rect(24, 6, 4, 4, 'highlight', 0.75), rect(-4, 0, 4, 8, 'highlight', 0.35), rect(4, 2, 4, 8, 'accent', 0.35),
    rect(-16, 4, 4, 8, 'accent', 0.45), rect(-8, 8, 4, 8, 'highlight', 0.35), rect(0, 10, 4, 6, 'accent', 0.35), rect(-4, -20, 4, 4, 'purple', 0.65),
  ]),

  // I073 — Oplophorus spinosus / deep-sea shrimp; serrated rostrum and photophore row.
  defineSpeciesIcon('I073', 'shrimp', 1, [
    rect(-14, -12, 16, 12, 'silverBlue', 0.65), rect(-12, -16, 12, 4, 'shadow'), rect(-22, -8, 8, 4, 'accent'), rect(-20, -12, 4, 4, 'warning'), rect(-16, -16, 4, 4, 'warning'), rect(-12, -20, 4, 4, 'warning'),
    rect(-30, -16, 14, 2, 'highlight', 0.6), rect(-30, -12, 18, 2, 'accent', 0.5), rect(-2, -8, 8, 8, 'body', 0.6), rect(6, -6, 8, 8, 'body', 0.55), rect(14, -4, 8, 8, 'body', 0.5), rect(22, -2, 6, 6, 'body', 0.45),
    rect(-4, 0, 4, 4, 'magenta'), rect(4, 2, 4, 4, 'magenta'), rect(12, 4, 4, 4, 'magenta'), rect(20, 6, 4, 4, 'magenta'), rect(24, -10, 4, 4, 'highlight'), rect(24, 8, 4, 4, 'highlight'), rect(-14, 4, 4, 8, 'accent', 0.55),
  ]),

  // I074 — Notostomus gibbosus / deep-sea shrimp; high dorsal hump and thin abdomen.
  defineSpeciesIcon('I074', 'shrimp', 2, [
    rect(-12, -24, 20, 4, 'shadow'), rect(-18, -20, 32, 4, 'body', 0.6), rect(-20, -16, 24, 12, 'body', 0.55), rect(-22, -8, 8, 4, 'accent'),
    rect(-30, -16, 14, 2, 'highlight', 0.5), rect(-30, -12, 18, 2, 'accent', 0.45), rect(-8, -16, 8, 4, 'warning', 0.6), rect(-4, -8, 8, 8, 'silverBlue', 0.45), rect(4, -6, 8, 8, 'body', 0.45), rect(12, -4, 8, 8, 'silverBlue', 0.4), rect(20, -2, 8, 6, 'body', 0.4),
    rect(24, -10, 4, 4, 'highlight'), rect(24, 6, 4, 4, 'highlight'), rect(-10, 4, 4, 8, 'accent', 0.4), rect(0, 6, 4, 8, 'highlight', 0.35), rect(8, 8, 4, 8, 'accent', 0.35), rect(16, 8, 4, 6, 'highlight', 0.3),
  ]),

  // I075 — Plesionika martia / golden shrimp; long rostrum and gold-banded abdomen.
  defineSpeciesIcon('I075', 'shrimp', 0, [
    rect(-14, -12, 16, 12, 'body', 0.7), rect(-16, -16, 12, 4, 'accent', 0.65), rect(-24, -8, 8, 4, 'yellow'), rect(-30, -18, 14, 2, 'highlight', 0.6), rect(-30, -14, 18, 2, 'accent', 0.5),
    rect(-2, -8, 8, 8, 'yellow', 0.7), rect(6, -6, 8, 8, 'warning', 0.7), rect(14, -4, 8, 8, 'yellow', 0.65), rect(22, -2, 6, 6, 'warning', 0.6), rect(24, -10, 4, 4, 'yellow'), rect(24, 8, 4, 4, 'yellow'),
    rect(-14, 0, 4, 8, 'accent', 0.5), rect(-8, 6, 4, 8, 'highlight', 0.45), rect(-2, 8, 4, 8, 'accent', 0.45), rect(4, 8, 4, 8, 'highlight', 0.4), rect(12, 8, 4, 6, 'accent', 0.4), rect(-20, -12, 4, 4, 'warning'), rect(-16, -12, 4, 4, 'yellow'),
  ]),

  // I076 — Hymenopenaeus debilis / deep-sea shrimp; fragile penaeid with sparse bands.
  defineSpeciesIcon('I076', 'shrimp', 1, [
    rect(-16, -12, 14, 12, 'pale', 0.65), rect(-18, -16, 10, 4, 'accent', 0.55), rect(-28, -8, 12, 4, 'highlight', 0.55), rect(-30, -16, 14, 2, 'accent', 0.5), rect(-30, -12, 18, 2, 'highlight', 0.4),
    rect(-2, -8, 8, 8, 'pale', 0.5), rect(6, -6, 8, 8, 'silverBlue', 0.5), rect(14, -4, 8, 8, 'pale', 0.45), rect(22, -2, 6, 6, 'silverBlue', 0.4), rect(-2, 0, 4, 8, 'accent', 0.45), rect(6, 2, 4, 8, 'highlight', 0.35), rect(14, 4, 4, 8, 'accent', 0.35),
    rect(24, -10, 4, 4, 'pale', 0.65), rect(24, 8, 4, 4, 'pale', 0.65), rect(-12, 4, 4, 8, 'accent', 0.4), rect(-6, 8, 4, 8, 'highlight', 0.35),
  ]),

  // I077 — Gennadas valens / deep-sea shrimp; compact body and underside photophore chain.
  defineSpeciesIcon('I077', 'shrimp', 2, [
    rect(-14, -12, 18, 12, 'body', 0.65), rect(-14, -16, 12, 4, 'shadow'), rect(-22, -8, 8, 4, 'accent'), rect(-30, -16, 14, 2, 'highlight', 0.55), rect(-30, -12, 18, 2, 'accent', 0.45),
    rect(-4, -8, 8, 8, 'magenta', 0.55), rect(4, -6, 8, 8, 'magenta', 0.5), rect(12, -4, 8, 8, 'magenta', 0.45), rect(20, -2, 8, 6, 'magenta', 0.4),
    rect(-12, 2, 4, 4, 'warning'), rect(-4, 2, 4, 4, 'warning'), rect(4, 4, 4, 4, 'warning'), rect(12, 6, 4, 4, 'warning'), rect(20, 8, 4, 4, 'warning'), rect(24, -10, 4, 4, 'highlight'), rect(24, 8, 4, 4, 'highlight'), rect(-14, 4, 4, 8, 'accent', 0.45), rect(0, 10, 4, 6, 'accent', 0.35),
  ]),

  // I078 — Nematocarcinus ensifer / saber shrimp; sword-like rostrum and threadlike legs.
  defineSpeciesIcon('I078', 'shrimp', 0, [
    rect(-14, -10, 14, 10, 'body', 0.65), rect(-16, -14, 12, 4, 'accent', 0.55), rect(-32, -6, 20, 4, 'silverBlue'), rect(-32, -10, 4, 4, 'warning'), rect(-24, -10, 4, 4, 'warning'), rect(-32, -18, 20, 2, 'highlight', 0.6), rect(-32, -14, 24, 2, 'accent', 0.5),
    rect(-2, -6, 6, 6, 'body', 0.55), rect(4, -4, 6, 6, 'silverBlue', 0.5), rect(10, -2, 6, 6, 'body', 0.45), rect(16, 0, 6, 6, 'silverBlue', 0.4), rect(22, 2, 6, 6, 'body', 0.4), rect(24, -8, 4, 4, 'highlight'), rect(24, 10, 4, 4, 'highlight'),
    rect(-12, 0, 4, 12, 'accent'), rect(-6, 4, 4, 12, 'highlight'), rect(0, 6, 4, 12, 'accent'), rect(6, 8, 4, 12, 'highlight'), rect(12, 10, 4, 10, 'accent'), rect(18, 12, 4, 8, 'highlight'),
  ]),

  // I079 — Debaspis debilis / deep-sea shrimp; delicate low-alpha outline.
  defineSpeciesIcon('I079', 'shrimp', 1, [
    rect(-16, -10, 12, 8, 'silverBlue', 0.45), rect(-20, -8, 8, 4, 'highlight', 0.4), rect(-30, -16, 14, 2, 'accent', 0.35), rect(-30, -12, 18, 2, 'highlight', 0.3),
    rect(-4, -6, 6, 6, 'pale', 0.4), rect(2, -4, 6, 6, 'silverBlue', 0.35), rect(8, -2, 6, 6, 'pale', 0.3), rect(14, 0, 6, 6, 'silverBlue', 0.3), rect(20, 2, 6, 6, 'pale', 0.25), rect(24, -8, 4, 4, 'highlight', 0.45), rect(24, 10, 4, 4, 'highlight', 0.45),
    rect(-14, 0, 4, 8, 'accent', 0.3), rect(-8, 4, 4, 8, 'highlight', 0.25), rect(0, 8, 4, 8, 'accent', 0.25),
  ]),

  // I080 — Rimicaris chacei / vent shrimp; narrow cephalothorax and visible chelipeds.
  defineSpeciesIcon('I080', 'shrimp', 2, [
    rect(-14, -12, 16, 12, 'magenta', 0.75), rect(-12, -16, 12, 4, 'shadow'), rect(-22, -8, 8, 4, 'accent'), rect(-30, -16, 14, 2, 'highlight', 0.6), rect(-30, -12, 18, 2, 'accent', 0.5), rect(-10, 0, 8, 4, 'dark'),
    rect(-16, 4, 4, 8, 'warning'), rect(-10, 6, 4, 8, 'warning'), rect(-2, -8, 8, 8, 'magenta', 0.7), rect(6, -6, 8, 8, 'magenta', 0.65), rect(14, -4, 8, 8, 'magenta', 0.6), rect(22, -2, 6, 6, 'magenta', 0.55),
    rect(-4, 0, 4, 4, 'warning'), rect(4, 2, 4, 4, 'warning'), rect(12, 4, 4, 4, 'warning'), rect(20, 6, 4, 4, 'warning'), rect(24, -10, 4, 4, 'highlight'), rect(24, 8, 4, 4, 'highlight'), rect(-4, -20, 8, 4, 'warning'),
  ]),

  // I081 — Benthoecetes bartletti / Bartlett's deep-sea shrimp; long blue rostrum.
  defineSpeciesIcon('I081', 'shrimp', 0, [
    rect(-14, -12, 16, 12, 'body', 0.65), rect(-16, -16, 12, 4, 'accent', 0.55), rect(-26, -8, 10, 4, 'silverBlue'), rect(-30, -18, 14, 2, 'highlight', 0.55), rect(-30, -14, 18, 2, 'accent', 0.45),
    rect(-2, -8, 8, 8, 'silverBlue', 0.6), rect(6, -6, 8, 8, 'body', 0.55), rect(14, -4, 8, 8, 'silverBlue', 0.5), rect(22, -2, 6, 6, 'body', 0.45),
    rect(-8, 2, 4, 8, 'accent', 0.5), rect(0, 4, 4, 8, 'highlight', 0.45), rect(8, 6, 4, 8, 'accent', 0.4), rect(16, 8, 4, 6, 'highlight', 0.4), rect(24, -10, 4, 4, 'accent'), rect(24, 8, 4, 4, 'accent'), rect(-20, -12, 4, 4, 'warning'),
  ]),

  // I082 — Robustosergia robusta / robust deep-sea shrimp; thick thorax and chunky abdomen.
  defineSpeciesIcon('I082', 'shrimp', 1, [
    rect(-16, -14, 20, 16, 'body', 0.8), rect(-18, -18, 16, 4, 'shadow'), rect(-24, -8, 8, 4, 'accent'), rect(-30, -16, 14, 2, 'highlight', 0.5), rect(-30, -12, 18, 2, 'accent', 0.45),
    rect(2, -10, 10, 10, 'body', 0.7), rect(12, -8, 10, 10, 'body', 0.65), rect(22, -6, 6, 8, 'body', 0.6), rect(24, -12, 4, 4, 'highlight'), rect(24, 4, 4, 4, 'highlight'),
    rect(-12, 2, 4, 10, 'accent'), rect(-4, 4, 4, 10, 'warning'), rect(4, 6, 4, 10, 'accent'), rect(14, 8, 4, 8, 'highlight'), rect(-20, 4, 4, 8, 'warning'), rect(-8, -4, 8, 4, 'highlight', 0.5),
  ]),

  // I083 — Pasiphaea multidentata / glass shrimp; many rostral teeth and transparent bands.
  defineSpeciesIcon('I083', 'shrimp', 2, [
    rect(-16, -12, 14, 12, 'silverBlue', 0.5), rect(-18, -16, 12, 4, 'accent', 0.45), rect(-28, -10, 12, 4, 'highlight', 0.55),
    rect(-28, -14, 4, 4, 'warning'), rect(-24, -14, 4, 4, 'warning'), rect(-20, -14, 4, 4, 'warning'), rect(-16, -14, 4, 4, 'warning'), rect(-32, -20, 20, 2, 'accent', 0.45), rect(-32, -16, 24, 2, 'highlight', 0.4),
    rect(-2, -8, 8, 8, 'body', 0.45), rect(6, -6, 8, 8, 'silverBlue', 0.4), rect(14, -4, 8, 8, 'body', 0.35), rect(22, -2, 6, 6, 'silverBlue', 0.3), rect(24, -10, 4, 4, 'highlight'), rect(24, 8, 4, 4, 'highlight'),
    rect(-8, 0, 4, 8, 'highlight', 0.3), rect(0, 2, 4, 8, 'accent', 0.3), rect(8, 4, 4, 8, 'highlight', 0.25), rect(-18, 4, 4, 8, 'accent', 0.35),
  ]),

  // I084 — Nematocarcinus gracilis / slender shrimp; fine body, long antennae and legs.
  defineSpeciesIcon('I084', 'shrimp', 0, [
    rect(-16, -10, 12, 8, 'body', 0.45), rect(-18, -14, 10, 4, 'accent', 0.4), rect(-30, -8, 14, 2, 'silverBlue', 0.5), rect(-30, -12, 4, 4, 'highlight'), rect(-32, -20, 20, 2, 'highlight', 0.4), rect(-32, -16, 24, 2, 'accent', 0.35),
    rect(-4, -6, 6, 6, 'body', 0.4), rect(2, -4, 6, 6, 'silverBlue', 0.35), rect(8, -2, 6, 6, 'body', 0.3), rect(14, 0, 6, 6, 'silverBlue', 0.3), rect(20, 2, 6, 6, 'body', 0.25), rect(24, -8, 4, 4, 'highlight'), rect(24, 10, 4, 4, 'highlight'),
    rect(-14, 0, 4, 12, 'accent', 0.35), rect(-8, 4, 4, 12, 'highlight', 0.3), rect(-2, 8, 4, 12, 'accent', 0.3), rect(4, 10, 4, 10, 'highlight', 0.25), rect(10, 12, 4, 8, 'accent', 0.25), rect(16, 14, 4, 6, 'highlight', 0.25),
  ]),
] as const;

