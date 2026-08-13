import type { SpeciesPixelIconDefinition } from '../model';
import type { PixelTone } from '../palette';
import { defineSpeciesIcon, rect } from '../primitives';

type FishHeadShape =
  | 'round'
  | 'wedge'
  | 'blunt'
  | 'dome'
  | 'barrel'
  | 'beak'
  | 'flat'
  | 'deep'
  | 'disc'
  | 'tapered';

type FishTailKind =
  | 'forked'
  | 'tapered'
  | 'filament'
  | 'ribbon'
  | 'eel'
  | 'small_lobe'
  | 'disc';

type FishDorsalKind =
  | 'low'
  | 'spiny'
  | 'high'
  | 'rear'
  | 'double'
  | 'far_rear'
  | 'lure'
  | 'none'
  | 'single';

type FishPhotophorePattern =
  | 'none'
  | 'patterned'
  | 'spots'
  | 'belly'
  | 'paired'
  | 'chain'
  | 'green'
  | 'blotches'
  | 'throat'
  | 'bands'
  | 'gill_slits'
  | 'spines';

type FishProfile = Readonly<{
  family: string;
  bodyLength: number;
  bodyHeight: number;
  headShape: FishHeadShape;
  snoutLength: number;
  jawSize: number;
  tailKind: FishTailKind;
  dorsalKind: FishDorsalKind;
  eyeSize: number;
  photophorePattern: FishPhotophorePattern;
  barbels: number;
  tones: readonly [PixelTone, PixelTone, PixelTone];
}>;

type FishProfileIconDefinition = SpeciesPixelIconDefinition & {
  readonly profile: FishProfile;
};

/**
 * Draws a compact, deterministic fish silhouette from catalog-derived traits.
 * The profile is retained on the definition as development metadata while the
 * returned value remains directly consumable by the species icon resolver.
 */
function fishProfileIcon(
  sourceCatalogId: string,
  profile: FishProfile,
): FishProfileIconDefinition {
  const rectangles = [] as ReturnType<typeof rect>[];
  const [bodyTone, accentTone, highlightTone] = profile.tones;
  const clamp = (value: number, minimum: number, maximum: number): number =>
    Math.max(minimum, Math.min(maximum, Math.round(value)));
  const add = (
    x: number,
    y: number,
    width: number,
    height: number,
    tone: PixelTone,
    alpha = 1,
  ): void => {
    const left = clamp(x, -31, 31);
    const top = clamp(y, -31, 31);
    const right = Math.min(32, left + Math.max(1, Math.round(width)));
    const bottom = Math.min(32, top + Math.max(1, Math.round(height)));
    if (right > left && bottom > top) {
      rectangles.push(rect(left, top, right - left, bottom - top, tone, alpha));
    }
  };

  const bodyLength = clamp(profile.bodyLength, 18, 44);
  const bodyHeight = clamp(profile.bodyHeight, 8, 26);
  const halfHeight = Math.max(4, Math.floor(bodyHeight / 2));
  const bodyLeft = -Math.floor(bodyLength / 2);
  const bodyRight = bodyLeft + bodyLength;
  const bodyTop = -halfHeight;
  const bodyBottom = halfHeight;

  add(bodyLeft + 4, bodyTop + 2, bodyLength - 9, 3, accentTone);
  add(bodyLeft + 2, bodyTop + 5, bodyLength - 4, Math.max(2, bodyHeight - 9), bodyTone);
  add(bodyLeft + 4, Math.max(bodyTop + 6, bodyBottom - 4), bodyLength - 9, 4, bodyTone);
  add(bodyLeft + 5, -1, bodyLength - 12, 2, highlightTone);
  add(bodyLeft + 3, bodyBottom - 2, bodyLength - 8, 2, 'shadow');

  const tailX = bodyLeft;
  switch (profile.tailKind) {
    case 'forked':
      add(tailX - 9, bodyTop + 1, 8, 3, accentTone);
      add(tailX - 9, bodyBottom - 4, 8, 3, accentTone);
      add(tailX - 5, -2, 6, 4, bodyTone);
      break;
    case 'tapered':
      add(tailX - 8, bodyTop + 3, 8, 3, accentTone);
      add(tailX - 9, -1, 9, 4, bodyTone);
      add(tailX - 7, bodyBottom - 4, 7, 3, accentTone);
      break;
    case 'filament':
      add(tailX - 7, -2, 7, 4, bodyTone);
      add(tailX - 11, -1, 5, 2, accentTone);
      add(tailX - 14, 0, 4, 1, highlightTone);
      break;
    case 'ribbon':
      add(tailX - 12, bodyTop + 1, 12, 2, accentTone);
      add(tailX - 12, bodyBottom - 3, 12, 2, accentTone);
      add(tailX - 6, -2, 7, 4, bodyTone);
      break;
    case 'eel':
      add(tailX - 11, -3, 11, 6, bodyTone);
      add(tailX - 16, -2, 6, 4, accentTone);
      add(tailX - 19, -1, 4, 2, highlightTone);
      break;
    case 'small_lobe':
      add(tailX - 6, bodyTop + 3, 6, 3, accentTone);
      add(tailX - 6, bodyBottom - 5, 6, 3, accentTone);
      add(tailX - 4, -2, 5, 4, bodyTone);
      break;
    case 'disc':
      add(tailX - 7, -3, 7, 6, accentTone);
      add(tailX - 13, -1, 7, 2, bodyTone);
      add(tailX - 16, 0, 4, 1, highlightTone);
      break;
  }

  switch (profile.headShape) {
    case 'round':
      add(bodyRight - 8, bodyTop + 2, 8, bodyHeight - 4, bodyTone);
      add(bodyRight - 5, bodyTop, 5, 3, bodyTone);
      break;
    case 'wedge':
      add(bodyRight - 9, bodyTop + 2, 5, bodyHeight - 4, bodyTone);
      add(bodyRight - 4, bodyTop + 4, 4, bodyHeight - 8, bodyTone);
      break;
    case 'blunt':
      add(bodyRight - 8, bodyTop, 8, bodyHeight, bodyTone);
      break;
    case 'dome':
      add(bodyRight - 9, bodyTop + 3, 8, bodyHeight - 3, bodyTone);
      add(bodyRight - 7, bodyTop, 6, 4, highlightTone, 0.72);
      break;
    case 'barrel':
      add(bodyRight - 9, bodyTop, 9, bodyHeight, bodyTone);
      add(bodyRight - 6, bodyTop - 2, 5, 3, accentTone);
      break;
    case 'beak':
      add(bodyRight - 8, bodyTop + 3, 6, bodyHeight - 6, bodyTone);
      add(bodyRight - 2, -2, 3, 4, bodyTone);
      break;
    case 'flat':
      add(bodyRight - 8, bodyTop + 4, 8, Math.max(3, bodyHeight - 8), bodyTone);
      break;
    case 'deep':
      add(bodyRight - 10, bodyTop, 10, bodyHeight, bodyTone);
      add(bodyRight - 6, bodyTop - 2, 5, 3, accentTone);
      break;
    case 'disc':
      add(bodyRight - 10, bodyTop - 2, 10, bodyHeight + 4, bodyTone);
      add(bodyRight - 7, bodyTop - 4, 5, 3, accentTone);
      break;
    case 'tapered':
      add(bodyRight - 8, bodyTop + 3, 7, bodyHeight - 6, bodyTone);
      add(bodyRight - 2, -2, 3, 4, accentTone);
      break;
  }

  const snoutLength = clamp(profile.snoutLength, 0, 10);
  const snoutX = bodyRight - 1;
  if (snoutLength > 0) {
    const snoutY = profile.headShape === 'beak' ? -2 : Math.max(-2, bodyTop + 4);
    const snoutHeight = profile.headShape === 'flat' ? 2 : 3;
    add(snoutX, snoutY, snoutLength, snoutHeight, accentTone);
    if (snoutLength >= 5) {
      add(snoutX + 2, snoutY + snoutHeight, snoutLength - 2, 2, bodyTone);
    }
  }

  const jawSize = clamp(profile.jawSize, 0, 10);
  if (jawSize > 0) {
    const jawWidth = clamp(2 + jawSize, 3, 11);
    const jawHeight = clamp(2 + Math.floor(jawSize / 3), 2, 5);
    const jawX = Math.min(31 - jawWidth, bodyRight + Math.max(0, snoutLength - Math.floor(jawWidth / 2)));
    const jawY = Math.max(2, Math.floor(halfHeight / 2));
    add(jawX, jawY, jawWidth, jawHeight, 'dark');
    if (jawSize >= 5) {
      const toothCount = Math.min(3, Math.floor(jawSize / 3));
      for (let tooth = 0; tooth < toothCount; tooth += 1) {
        add(jawX + 1 + tooth * 3, jawY + jawHeight, 2, Math.min(5, jawSize - 2), 'ivory');
      }
    }
  }

  const eyeSize = clamp(profile.eyeSize, 2, 6);
  const eyeX = bodyRight - eyeSize - 4;
  const eyeY =
    profile.headShape === 'dome' || profile.headShape === 'barrel'
      ? bodyTop - 2
      : -Math.max(1, Math.floor(eyeSize / 2));
  add(eyeX, eyeY, eyeSize, eyeSize, highlightTone);
  add(eyeX + Math.max(1, eyeSize - 2), eyeY + 1, Math.min(2, eyeSize - 1), Math.min(2, eyeSize - 1), 'dark');

  switch (profile.dorsalKind) {
    case 'low':
      add(bodyLeft + 8, bodyTop - 4, 8, 3, accentTone);
      break;
    case 'spiny':
      for (let spine = 0; spine < 4; spine += 1) {
        add(bodyLeft + 5 + spine * 4, bodyTop - 3 - (spine % 2), 2, 3 + (spine % 2) * 2, accentTone);
      }
      break;
    case 'high':
      add(bodyLeft + 8, bodyTop - 10, 4, 10, accentTone);
      add(bodyLeft + 12, bodyTop - 6, 8, 4, accentTone);
      break;
    case 'rear':
      add(bodyRight - 13, bodyTop - 7, 4, 7, accentTone);
      add(bodyRight - 9, bodyTop - 4, 6, 4, accentTone);
      break;
    case 'double':
      add(bodyLeft + 8, bodyTop - 5, 6, 4, accentTone);
      add(bodyRight - 12, bodyTop - 4, 6, 3, accentTone);
      break;
    case 'far_rear':
      add(bodyRight - 8, bodyTop - 7, 4, 7, accentTone);
      add(bodyRight - 4, bodyTop - 4, 3, 4, accentTone);
      break;
    case 'lure':
      add(bodyRight - 8, bodyTop - 12, 2, 12, accentTone);
      add(bodyRight - 10, bodyTop - 15, 6, 3, highlightTone);
      add(bodyRight - 9, bodyTop - 18, 4, 3, accentTone);
      break;
    case 'single':
      add(bodyRight - 12, bodyTop - 6, 4, 6, accentTone);
      break;
    case 'none':
      break;
  }

  const addLight = (x: number, y: number, width = 2, height = 2): void => {
    add(x, y, width, height, highlightTone);
  };
  switch (profile.photophorePattern) {
    case 'patterned':
      addLight(bodyLeft + 8, bodyBottom - 4);
      addLight(bodyLeft + 14, bodyBottom - 3);
      addLight(bodyLeft + 20, bodyBottom - 4);
      addLight(bodyLeft + 26, bodyBottom - 3);
      break;
    case 'spots':
      addLight(bodyLeft + 8, -2, 3, 3);
      addLight(bodyLeft + 15, 3, 2, 2);
      addLight(bodyLeft + 22, -4, 2, 2);
      addLight(bodyLeft + 28, 4, 3, 3);
      addLight(bodyRight - 7, 2, 2, 2);
      break;
    case 'belly':
      for (let light = 0; light < 4; light += 1) {
        addLight(bodyLeft + 8 + light * 5, bodyBottom - 3);
      }
      break;
    case 'paired':
      for (let pair = 0; pair < 3; pair += 1) {
        addLight(bodyLeft + 9 + pair * 7, -3);
        addLight(bodyLeft + 9 + pair * 7, bodyBottom - 3);
      }
      break;
    case 'chain':
      for (let light = 0; light < 5; light += 1) {
        addLight(bodyLeft + 7 + light * 5, 2 + (light % 2));
      }
      break;
    case 'green':
      addLight(bodyRight - 8, bodyTop - 1, 3, 3);
      addLight(bodyRight - 15, -1, 3, 2);
      addLight(bodyLeft + 8, bodyBottom - 3, 3, 2);
      break;
    case 'blotches':
      add(bodyLeft + 8, bodyTop + 3, 4, 4, accentTone);
      add(bodyLeft + 17, bodyBottom - 7, 5, 4, accentTone);
      add(bodyLeft + 27, bodyTop + 5, 4, 5, accentTone);
      break;
    case 'throat':
      addLight(bodyRight - 10, bodyBottom - 4, 3, 3);
      addLight(bodyRight - 5, bodyBottom - 3, 2, 2);
      break;
    case 'bands':
      add(bodyLeft + 10, bodyTop + 3, 2, bodyHeight - 6, accentTone);
      add(bodyLeft + 18, bodyTop + 3, 2, bodyHeight - 6, highlightTone);
      add(bodyLeft + 26, bodyTop + 3, 2, bodyHeight - 6, accentTone);
      break;
    case 'gill_slits':
      for (let slit = 0; slit < 4; slit += 1) {
        add(bodyRight - 15 + slit * 3, bodyTop + 5, 2, bodyHeight - 9, accentTone);
      }
      break;
    case 'spines':
      addLight(bodyLeft + 10, bodyTop + 4, 2, 2);
      addLight(bodyLeft + 18, bodyTop + 5, 2, 2);
      addLight(bodyLeft + 26, bodyTop + 4, 2, 2);
      break;
    case 'none':
      break;
  }

  const barbelCount = clamp(profile.barbels, 0, 3);
  for (let barbel = 0; barbel < barbelCount; barbel += 1) {
    const barbelX = bodyRight - 4 - barbel * 3;
    const barbelY = bodyBottom - 1 + barbel * 2;
    add(barbelX, barbelY, 2, 6 + barbel * 2, accentTone);
    if (barbel === 0) {
      addLight(barbelX, barbelY + 6, 2, 2);
    }
  }

  return {
    ...defineSpeciesIcon(sourceCatalogId, 'fish', 0, rectangles),
    profile,
  };
}

/** Species-specific fish icons currently approved for the staged rollout. */
export const SPECIES_FISH_PIXEL_ICONS: readonly SpeciesPixelIconDefinition[] = [
  defineSpeciesIcon('F001', 'slender_fish', 0, [
    rect(-24, -1, 8, 2, 'accent'),
    rect(-24, -2, 4, 4, 'magenta'),
    rect(-16, -8, 28, 4, 'shadow'),
    rect(-16, -4, 28, 12, 'body'),
    rect(-12, 8, 24, 4, 'body'),
    rect(-4, -12, 8, 4, 'accent'),
    rect(8, -12, 12, 4, 'body'),
    rect(8, -8, 16, 16, 'body'),
    rect(12, -4, 12, 8, 'dark'),
    rect(8, -8, 4, 4, 'highlight'),
    rect(12, 4, 12, 4, 'body'),
    rect(4, 8, 20, 4, 'body'),
  ]),
  defineSpeciesIcon('F007', 'fish', 0, [
    rect(-24, -8, 8, 16, 'blackBrown'),
    rect(-20, -12, 8, 4, 'blackBrown'),
    rect(-20, 12, 8, 4, 'blackBrown'),
    rect(-8, -12, 8, 4, 'blackBrown'),
    rect(-16, -8, 28, 4, 'blackBrown'),
    rect(-16, -4, 28, 12, 'blackBrown'),
    rect(-12, 4, 24, 8, 'purple'),
    rect(8, -12, 12, 4, 'blackBrown'),
    rect(8, -8, 16, 8, 'blackBrown'),
    rect(8, 0, 16, 8, 'dark'),
    rect(8, 8, 16, 4, 'blackBrown'),
    rect(12, 4, 4, 8, 'ivory'),
    rect(20, 4, 4, 8, 'ivory'),
    rect(12, -4, 4, 4, 'highlight'),
  ]),
  defineSpeciesIcon('F008', 'slender_fish', 0, [
    rect(-24, -12, 8, 4, 'navy'),
    rect(-24, 8, 8, 4, 'navy'),
    rect(-20, -8, 8, 16, 'silverBlue'),
    rect(-16, -8, 32, 4, 'silverBlue'),
    rect(-16, -4, 36, 8, 'silverBlue'),
    rect(-12, 4, 32, 4, 'silverBlue'),
    rect(-8, -4, 20, 4, 'highlight'),
    rect(-8, -12, 24, 4, 'navy'),
    rect(-4, -20, 16, 8, 'navy'),
    rect(0, -24, 8, 4, 'navy'),
    rect(16, -4, 8, 8, 'silverBlue'),
    rect(20, -2, 4, 4, 'highlight'),
    rect(12, -4, 4, 4, 'dark'),
  ]),
  defineSpeciesIcon('F010', 'fish', 0, [
    rect(-24, -2, 4, 4, 'pale'),
    rect(-20, -6, 12, 12, 'pale'),
    rect(-16, -8, 12, 4, 'pale'),
    rect(-12, 6, 12, 4, 'pale'),
    rect(-8, -6, 16, 12, 'pale'),
    rect(0, -12, 16, 4, 'pale'),
    rect(0, -8, 24, 16, 'pale'),
    rect(0, 8, 16, 4, 'pale'),
    rect(16, -4, 8, 8, 'pale'),
    rect(12, -8, 4, 4, 'yellow'),
    rect(12, 0, 12, 4, 'dark'),
    rect(12, 4, 4, 4, 'white'),
    rect(20, 4, 4, 4, 'white'),
    rect(8, 8, 16, 4, 'pale'),
  ]),
  // Serrivomer beanii — catalog fact 0–6000 m; a stout eel with a saw-edged palate.
  defineSpeciesIcon('F002', 'slender_fish', 0, [
    rect(-30, -2, 6, 4, 'shadow'),
    rect(-26, -10, 8, 4, 'accent'),
    rect(-26, 6, 8, 4, 'accent'),
    rect(-22, -10, 28, 4, 'body'),
    rect(-22, -6, 34, 12, 'body'),
    rect(-18, 6, 28, 4, 'shadow'),
    rect(-8, -14, 12, 4, 'accent'),
    rect(2, 10, 12, 4, 'accent'),
    rect(8, -8, 14, 12, 'body'),
    rect(18, -6, 10, 8, 'highlight'),
    rect(24, -2, 6, 4, 'dark'),
    rect(22, 2, 6, 4, 'ivory'),
    rect(16, -8, 4, 4, 'warning'),
  ]),
  // Nemichthys scolopaceus — catalog fact 0–4337 m; thread-thin body and needle snout.
  defineSpeciesIcon('F003', 'slender_fish', 0, [
    rect(-30, -2, 6, 4, 'navy'),
    rect(-26, -7, 6, 4, 'navy'),
    rect(-26, 3, 6, 4, 'navy'),
    rect(-20, -3, 30, 6, 'silverBlue'),
    rect(-14, -7, 22, 4, 'shadow'),
    rect(-12, 3, 18, 3, 'silverBlue'),
    rect(8, -4, 16, 4, 'silverBlue'),
    rect(20, -3, 10, 2, 'highlight'),
    rect(8, -8, 6, 4, 'accent'),
    rect(4, 4, 8, 3, 'accent'),
    rect(12, -1, 3, 3, 'dark'),
  ]),
  // Synaphobranchus kaupii — catalog fact 120–4800 m; tapered arrowtooth eel.
  defineSpeciesIcon('F004', 'slender_fish', 0, [
    rect(-30, -3, 6, 6, 'shadow'),
    rect(-28, -12, 8, 4, 'accent'),
    rect(-28, 8, 8, 4, 'accent'),
    rect(-24, -8, 28, 4, 'body'),
    rect(-24, -4, 32, 8, 'body'),
    rect(-20, 4, 28, 4, 'shadow'),
    rect(-8, -14, 10, 4, 'accent'),
    rect(0, 10, 12, 4, 'accent'),
    rect(8, -8, 12, 12, 'body'),
    rect(20, -5, 10, 10, 'highlight'),
    rect(18, -6, 4, 4, 'highlight'),
    rect(26, -2, 4, 4, 'ivory'),
    rect(23, 3, 4, 4, 'ivory'),
    rect(28, 1, 3, 3, 'ivory'),
  ]),
  // Simenchelys parasitica — catalog fact 100–3000 m; thick eel with a blunt oral disc.
  defineSpeciesIcon('F005', 'slender_fish', 0, [
    rect(-30, -2, 6, 4, 'dark'),
    rect(-26, -9, 8, 4, 'shadow'),
    rect(-26, 5, 8, 4, 'shadow'),
    rect(-22, -10, 28, 4, 'body'),
    rect(-22, -6, 34, 12, 'body'),
    rect(-18, 6, 28, 6, 'shadow'),
    rect(-8, -14, 12, 4, 'accent'),
    rect(2, 12, 10, 4, 'accent'),
    rect(8, -8, 14, 16, 'body'),
    rect(22, -6, 8, 12, 'highlight'),
    rect(16, -6, 4, 4, 'warning'),
    rect(26, -2, 4, 4, 'dark'),
    rect(24, 2, 6, 4, 'magenta'),
  ]),
  // Notacanthus chemnitzii — catalog fact 125–3285 m; snub nose and a comb of dorsal spines.
  defineSpeciesIcon('F006', 'fish', 0, [
    rect(-30, -2, 6, 4, 'navy'),
    rect(-26, -10, 8, 4, 'navy'),
    rect(-26, 6, 8, 4, 'navy'),
    rect(-24, -10, 28, 4, 'silverBlue'),
    rect(-24, -6, 34, 14, 'silverBlue'),
    rect(-20, 8, 26, 4, 'shadow'),
    rect(6, -6, 14, 12, 'silverBlue'),
    rect(20, -4, 8, 8, 'dark'),
    rect(16, -6, 4, 4, 'yellow'),
    rect(-18, -16, 4, 6, 'accent'),
    rect(-12, -18, 4, 8, 'accent'),
    rect(-6, -17, 4, 7, 'accent'),
    rect(0, -16, 4, 6, 'accent'),
    rect(6, -15, 4, 5, 'accent'),
    rect(2, 10, 12, 4, 'shadow'),
  ]),
  // Omosudis lowii — catalog fact 0–4000 m; an elongated predator with an oversized toothed jaw.
  defineSpeciesIcon('F009', 'fish', 0, [
    rect(-30, -4, 6, 8, 'dark'),
    rect(-26, -12, 8, 4, 'accent'),
    rect(-26, 8, 8, 4, 'accent'),
    rect(-22, -10, 28, 4, 'purple'),
    rect(-22, -6, 32, 12, 'purple'),
    rect(-18, 6, 24, 6, 'shadow'),
    rect(-8, -16, 14, 6, 'warning'),
    rect(6, -10, 12, 8, 'body'),
    rect(14, -6, 14, 4, 'dark'),
    rect(14, 0, 16, 6, 'dark'),
    rect(18, -1, 12, 4, 'blackBrown'),
    rect(20, -6, 3, 8, 'ivory'),
    rect(25, 0, 3, 8, 'ivory'),
    rect(10, -10, 4, 4, 'highlight'),
    rect(8, 6, 10, 4, 'accent'),
  ]),
  // Evermannella balbo — catalog fact 100–1000 m; streamlined sabretooth with paired fangs.
  defineSpeciesIcon('F011', 'fish', 0, [
    rect(-30, -4, 6, 8, 'navy'),
    rect(-28, -12, 8, 4, 'navy'),
    rect(-28, 8, 8, 4, 'navy'),
    rect(-22, -10, 30, 4, 'purple'),
    rect(-22, -6, 34, 12, 'silverBlue'),
    rect(-18, 6, 28, 4, 'purple'),
    rect(-6, -16, 12, 6, 'accent'),
    rect(-2, 10, 10, 4, 'accent'),
    rect(8, -8, 12, 4, 'silverBlue'),
    rect(18, -4, 10, 8, 'silverBlue'),
    rect(12, -8, 4, 4, 'yellow'),
    rect(24, -2, 3, 8, 'ivory'),
    rect(21, 2, 3, 7, 'ivory'),
    rect(18, 4, 10, 3, 'dark'),
    rect(-2, -2, 14, 3, 'highlight'),
  ]),
  // Bathypterois grallator — catalog fact 878–4720 m; tripod fish with three long fin rays.
  defineSpeciesIcon('F012', 'fish', 0, [
    rect(-30, -2, 6, 4, 'navy'),
    rect(-26, -8, 8, 4, 'navy'),
    rect(-26, 4, 8, 4, 'navy'),
    rect(-20, -8, 24, 4, 'silverBlue'),
    rect(-20, -4, 28, 10, 'silverBlue'),
    rect(-16, 6, 22, 4, 'shadow'),
    rect(6, -6, 12, 8, 'silverBlue'),
    rect(18, -4, 8, 4, 'dark'),
    rect(12, -6, 4, 4, 'highlight'),
    rect(-8, -14, 10, 6, 'accent'),
    rect(-4, 10, 4, 16, 'accent'),
    rect(-10, 24, 14, 4, 'accent'),
    rect(8, 10, 4, 16, 'warning'),
    rect(4, 24, 14, 4, 'warning'),
    rect(18, 8, 4, 20, 'shadow'),
    rect(14, 28, 12, 4, 'shadow'),
  ]),
  // Anoplogaster cornuta — catalog fact 2–4992 m; deep-bodied fangtooth with huge teeth.
  defineSpeciesIcon('F013', 'fish', 0, [
    rect(-28, -4, 8, 8, 'dark'),
    rect(-26, -12, 8, 4, 'blackBrown'),
    rect(-26, 8, 8, 4, 'blackBrown'),
    rect(-20, -12, 24, 4, 'blackBrown'),
    rect(-20, -8, 28, 16, 'blackBrown'),
    rect(-16, 8, 22, 4, 'purple'),
    rect(-8, -16, 12, 4, 'purple'),
    rect(-4, 12, 12, 4, 'purple'),
    rect(4, -10, 14, 16, 'blackBrown'),
    rect(18, -6, 8, 12, 'blackBrown'),
    rect(10, -8, 6, 6, 'warning'),
    rect(18, -1, 12, 4, 'dark'),
    rect(20, -4, 4, 10, 'ivory'),
    rect(24, 2, 4, 10, 'ivory'),
    rect(8, 2, 6, 4, 'highlight'),
  ]),
  // Chauliodus sloani — catalog fact 200–4700 m; viperfish fangs, tall dorsal fin, and photophores.
  defineSpeciesIcon('F014', 'fish', 0, [
    rect(-30, -3, 6, 6, 'navy'),
    rect(-28, -12, 8, 4, 'navy'),
    rect(-28, 8, 8, 4, 'navy'),
    rect(-22, -8, 32, 4, 'silverBlue'),
    rect(-22, -4, 36, 10, 'navy'),
    rect(-16, 6, 28, 4, 'purple'),
    rect(-8, -16, 12, 4, 'accent'),
    rect(-4, -26, 4, 10, 'accent'),
    rect(8, -8, 12, 8, 'silverBlue'),
    rect(18, -4, 10, 4, 'silverBlue'),
    rect(10, -8, 4, 4, 'highlight'),
    rect(14, 0, 14, 6, 'dark'),
    rect(20, -4, 4, 10, 'ivory'),
    rect(24, 0, 4, 8, 'ivory'),
    rect(26, 6, 3, 10, 'magenta'),
    rect(-8, 2, 4, 4, 'warning'),
    rect(-2, 2, 4, 4, 'warning'),
  ]),
  // Malacosteus niger — catalog fact 500–3886 m; black loosejaw with stoplight organs.
  defineSpeciesIcon('F015', 'fish', 0, [
    rect(-30, -4, 6, 8, 'dark'),
    rect(-26, -12, 8, 4, 'dark'),
    rect(-26, 8, 8, 4, 'blackBrown'),
    rect(-22, -8, 28, 4, 'blackBrown'),
    rect(-22, -4, 32, 10, 'dark'),
    rect(-18, 6, 26, 4, 'blackBrown'),
    rect(-8, -14, 10, 4, 'purple'),
    rect(4, -8, 14, 8, 'dark'),
    rect(14, -4, 14, 4, 'blackBrown'),
    rect(14, 0, 16, 6, 'dark'),
    rect(26, 4, 5, 4, 'dark'),
    rect(10, -8, 4, 4, 'highlight'),
    rect(10, 0, 4, 4, 'magenta'),
    rect(6, 0, 4, 4, 'warning'),
    rect(-4, 8, 4, 4, 'warning'),
    rect(2, 8, 4, 4, 'magenta'),
    rect(16, -2, 4, 4, 'highlight'),
  ]),
  // Idiacanthus atlanticus — catalog fact 1239–2000 m; black dragonfish with barbel and light row.
  defineSpeciesIcon('F016', 'slender_fish', 0, [
    rect(-30, -3, 6, 6, 'dark'),
    rect(-26, -8, 8, 4, 'dark'),
    rect(-26, 4, 8, 4, 'dark'),
    rect(-22, -6, 34, 4, 'blackBrown'),
    rect(-22, -2, 36, 8, 'dark'),
    rect(-18, 6, 28, 4, 'blackBrown'),
    rect(-10, -12, 12, 4, 'purple'),
    rect(8, -8, 12, 6, 'dark'),
    rect(16, -4, 14, 4, 'dark'),
    rect(16, 0, 16, 4, 'blackBrown'),
    rect(22, -4, 3, 8, 'ivory'),
    rect(26, 0, 3, 8, 'ivory'),
    rect(27, 4, 3, 18, 'magenta'),
    rect(10, -8, 4, 4, 'warning'),
    rect(-8, 4, 4, 3, 'accent'),
    rect(-2, 4, 4, 3, 'accent'),
    rect(4, 4, 4, 3, 'accent'),
    rect(10, 4, 4, 3, 'accent'),
  ]),
  // Borostomias antarcticus — catalog fact 300–2630 m; snaggletooth dragonfish with a chin barbel.
  defineSpeciesIcon('F017', 'fish', 0, [
    rect(-30, -4, 6, 8, 'navy'),
    rect(-26, -12, 8, 4, 'navy'),
    rect(-26, 8, 8, 4, 'navy'),
    rect(-22, -10, 28, 4, 'purple'),
    rect(-22, -6, 32, 12, 'blackBrown'),
    rect(-18, 6, 26, 6, 'dark'),
    rect(-10, -16, 12, 4, 'accent'),
    rect(4, -10, 14, 12, 'blackBrown'),
    rect(14, -6, 14, 4, 'dark'),
    rect(14, 0, 16, 6, 'dark'),
    rect(18, -4, 3, 8, 'ivory'),
    rect(23, -4, 3, 10, 'ivory'),
    rect(22, 2, 3, 7, 'ivory'),
    rect(27, 4, 3, 14, 'accent'),
    rect(8, -8, 4, 4, 'warning'),
    rect(-8, 4, 4, 4, 'warning'),
    rect(-2, 6, 4, 4, 'warning'),
  ]),
  // Sigmops elongatus — catalog fact 25–4740 m; elongated bristlemouth with a chain of organs.
  defineSpeciesIcon('F018', 'slender_fish', 0, [
    rect(-30, -3, 6, 6, 'silverBlue'),
    rect(-26, -10, 8, 4, 'navy'),
    rect(-26, 6, 8, 4, 'navy'),
    rect(-22, -8, 30, 4, 'silverBlue'),
    rect(-22, -4, 34, 8, 'silverBlue'),
    rect(-18, 4, 26, 4, 'shadow'),
    rect(-6, -14, 10, 4, 'accent'),
    rect(0, 8, 12, 4, 'accent'),
    rect(10, -6, 12, 8, 'silverBlue'),
    rect(20, 0, 10, 3, 'dark'),
    rect(14, -6, 4, 4, 'highlight'),
    rect(-10, 4, 4, 4, 'warning'),
    rect(-4, 4, 4, 4, 'warning'),
    rect(2, 4, 4, 4, 'warning'),
    rect(8, 4, 4, 4, 'warning'),
    rect(24, 2, 2, 4, 'ivory'),
  ]),
  // Cyclothone microdon — catalog fact 200–5301 m; veiled anglemouth with a gaping mouth.
  defineSpeciesIcon('F019', 'fish', 0, [
    rect(-28, -3, 6, 6, 'navy'),
    rect(-24, -9, 6, 4, 'navy'),
    rect(-24, 5, 6, 4, 'navy'),
    rect(-20, -8, 24, 4, 'purple'),
    rect(-20, -4, 28, 8, 'purple'),
    rect(-16, 4, 22, 4, 'dark'),
    rect(-8, -12, 8, 4, 'accent'),
    rect(6, -8, 10, 8, 'purple'),
    rect(14, -8, 10, 4, 'accent'),
    rect(14, -4, 14, 4, 'dark'),
    rect(14, 0, 14, 6, 'dark'),
    rect(20, -4, 3, 6, 'ivory'),
    rect(25, -4, 3, 6, 'ivory'),
    rect(8, -6, 4, 4, 'warning'),
    rect(-6, 4, 4, 4, 'warning'),
    rect(0, 6, 4, 4, 'warning'),
    rect(4, 8, 8, 3, 'accent'),
  ]),
  // Cyclothone pallida — catalog fact 16–4663 m; pale rounded bristlemouth with belly photophores.
  defineSpeciesIcon('F020', 'fish', 0, [
    rect(-28, -2, 6, 4, 'pale'),
    rect(-24, -8, 8, 4, 'silverBlue'),
    rect(-24, 4, 8, 4, 'silverBlue'),
    rect(-20, -10, 24, 4, 'pale'),
    rect(-20, -6, 30, 12, 'pale'),
    rect(-16, 6, 24, 4, 'shadow'),
    rect(-6, -14, 8, 4, 'warning'),
    rect(-2, 10, 10, 4, 'accent'),
    rect(8, -8, 12, 12, 'pale'),
    rect(18, -2, 10, 4, 'dark'),
    rect(12, -6, 4, 4, 'navy'),
    rect(22, -4, 2, 4, 'ivory'),
    rect(-8, 3, 4, 4, 'warning'),
    rect(-2, 4, 4, 4, 'warning'),
    rect(4, 4, 4, 4, 'warning'),
    rect(-14, -2, 14, 3, 'highlight'),
  ]),
  // Argyropelecus aculeatus — catalog fact 100–2056 m; hatchetfish profile with high fin and light line.
  defineSpeciesIcon('F021', 'fish', 0, [
    rect(-30, -3, 6, 6, 'navy'),
    rect(-26, -11, 8, 4, 'navy'),
    rect(-26, 7, 8, 4, 'navy'),
    rect(-22, -12, 20, 4, 'silverBlue'),
    rect(-22, -8, 28, 16, 'silverBlue'),
    rect(-18, 8, 26, 4, 'shadow'),
    rect(6, -8, 16, 12, 'silverBlue'),
    rect(22, -4, 8, 8, 'dark'),
    rect(12, -6, 4, 4, 'highlight'),
    rect(-10, -20, 8, 8, 'accent'),
    rect(-6, -26, 4, 6, 'accent'),
    rect(-4, 12, 12, 4, 'accent'),
    rect(-12, 4, 4, 4, 'warning'),
    rect(-6, 6, 4, 4, 'warning'),
    rect(0, 6, 4, 4, 'warning'),
    rect(6, 6, 4, 4, 'warning'),
    rect(-12, 0, 16, 4, 'highlight'),
  ]),
  // Maurolicus muelleri — catalog fact 271–1524 m; compact silvery lightfish with paired fins.
  defineSpeciesIcon('F022', 'fish', 0, [
    rect(-30, -2, 6, 4, 'navy'),
    rect(-26, -8, 8, 4, 'navy'),
    rect(-26, 4, 8, 4, 'navy'),
    rect(-22, -8, 28, 4, 'silverBlue'),
    rect(-22, -4, 32, 10, 'silverBlue'),
    rect(-18, 6, 26, 4, 'highlight'),
    rect(8, -8, 12, 12, 'silverBlue'),
    rect(18, -4, 10, 8, 'silverBlue'),
    rect(14, -6, 4, 4, 'dark'),
    rect(-6, -14, 8, 4, 'accent'),
    rect(0, 10, 10, 4, 'accent'),
    rect(-10, 4, 4, 4, 'yellow'),
    rect(-4, 6, 4, 4, 'yellow'),
    rect(2, 6, 4, 4, 'yellow'),
    rect(-14, -2, 16, 3, 'white'),
  ]),
  // F023 Lampanyctus crocodilus (Myctophidae), catalog fact 0-1200 m; patterned jewel lanternfish.
  fishProfileIcon('F023', {
    family: 'Myctophidae',
    bodyLength: 34,
    bodyHeight: 12,
    headShape: 'wedge',
    snoutLength: 2,
    jawSize: 1,
    tailKind: 'forked',
    dorsalKind: 'low',
    eyeSize: 3,
    photophorePattern: 'patterned',
    barbels: 0,
    tones: ['navy', 'accent', 'yellow'],
  }),
  // F024 Myctophum punctatum (Myctophidae), catalog fact 0-1000 m; spotted lanternfish.
  fishProfileIcon('F024', {
    family: 'Myctophidae',
    bodyLength: 33,
    bodyHeight: 13,
    headShape: 'round',
    snoutLength: 1,
    jawSize: 1,
    tailKind: 'tapered',
    dorsalKind: 'low',
    eyeSize: 4,
    photophorePattern: 'spots',
    barbels: 0,
    tones: ['silverBlue', 'purple', 'yellow'],
  }),
  // F025 Electrona antarctica (Myctophidae), catalog fact 1-1010 m; compressed Antarctic lanternfish.
  fishProfileIcon('F025', {
    family: 'Myctophidae',
    bodyLength: 27,
    bodyHeight: 12,
    headShape: 'flat',
    snoutLength: 0,
    jawSize: 1,
    tailKind: 'forked',
    dorsalKind: 'single',
    eyeSize: 3,
    photophorePattern: 'belly',
    barbels: 0,
    tones: ['navy', 'silverBlue', 'highlight'],
  }),
  // F026 Macropinna microstoma (Opisthoproctidae), catalog fact 16-1267 m; barreleye with tubular eyes.
  fishProfileIcon('F026', {
    family: 'Opisthoproctidae',
    bodyLength: 26,
    bodyHeight: 14,
    headShape: 'dome',
    snoutLength: 1,
    jawSize: 1,
    tailKind: 'tapered',
    dorsalKind: 'none',
    eyeSize: 6,
    photophorePattern: 'green',
    barbels: 0,
    tones: ['silverBlue', 'accent', 'yellow'],
  }),
  // F027 Dolichopteryx longipes (Opisthoproctidae), catalog fact 500-2400 m; deep-bodied spookfish.
  fishProfileIcon('F027', {
    family: 'Opisthoproctidae',
    bodyLength: 28,
    bodyHeight: 20,
    headShape: 'barrel',
    snoutLength: 2,
    jawSize: 2,
    tailKind: 'forked',
    dorsalKind: 'double',
    eyeSize: 5,
    photophorePattern: 'none',
    barbels: 0,
    tones: ['pale', 'purple', 'highlight'],
  }),
  // F028 Opisthoproctus soleatus (Opisthoproctidae), catalog fact 300-800 m; dark barrel-eye.
  fishProfileIcon('F028', {
    family: 'Opisthoproctidae',
    bodyLength: 25,
    bodyHeight: 16,
    headShape: 'dome',
    snoutLength: 3,
    jawSize: 1,
    tailKind: 'small_lobe',
    dorsalKind: 'low',
    eyeSize: 6,
    photophorePattern: 'none',
    barbels: 0,
    tones: ['dark', 'navy', 'accent'],
  }),
  // F029 Barbourisia rufa (Barbourisiidae), catalog fact 120-2000 m; velvety whalefish with a large jaw.
  fishProfileIcon('F029', {
    family: 'Barbourisiidae',
    bodyLength: 30,
    bodyHeight: 20,
    headShape: 'deep',
    snoutLength: 3,
    jawSize: 8,
    tailKind: 'small_lobe',
    dorsalKind: 'low',
    eyeSize: 4,
    photophorePattern: 'none',
    barbels: 0,
    tones: ['purple', 'blackBrown', 'ivory'],
  }),
  // F030 Rondeletia loricata (Rondeletiidae), catalog fact 100-3500 m; streamlined redmouth whalefish.
  fishProfileIcon('F030', {
    family: 'Rondeletiidae',
    bodyLength: 27,
    bodyHeight: 11,
    headShape: 'round',
    snoutLength: 2,
    jawSize: 4,
    tailKind: 'tapered',
    dorsalKind: 'none',
    eyeSize: 3,
    photophorePattern: 'throat',
    barbels: 0,
    tones: ['navy', 'pale', 'magenta'],
  }),
  // F031 Coryphaenoides armatus (Macrouridae), catalog fact 282-5180 m; large-headed abyssal rattail.
  fishProfileIcon('F031', {
    family: 'Macrouridae',
    bodyLength: 40,
    bodyHeight: 18,
    headShape: 'deep',
    snoutLength: 4,
    jawSize: 2,
    tailKind: 'tapered',
    dorsalKind: 'rear',
    eyeSize: 6,
    photophorePattern: 'none',
    barbels: 1,
    tones: ['blackBrown', 'navy', 'silverBlue'],
  }),
  // F032 Coryphaenoides rupestris (Macrouridae), catalog fact 180-2600 m; rounded-snout grenadier with barbel.
  fishProfileIcon('F032', {
    family: 'Macrouridae',
    bodyLength: 39,
    bodyHeight: 17,
    headShape: 'round',
    snoutLength: 5,
    jawSize: 4,
    tailKind: 'tapered',
    dorsalKind: 'low',
    eyeSize: 5,
    photophorePattern: 'none',
    barbels: 1,
    tones: ['blackBrown', 'silverBlue', 'ivory'],
  }),
  // F033 Coryphaenoides acrolepis (Macrouridae), catalog fact 300-3700 m; pointed, tubercled Pacific grenadier.
  fishProfileIcon('F033', {
    family: 'Macrouridae',
    bodyLength: 41,
    bodyHeight: 16,
    headShape: 'beak',
    snoutLength: 7,
    jawSize: 4,
    tailKind: 'tapered',
    dorsalKind: 'spiny',
    eyeSize: 6,
    photophorePattern: 'spines',
    barbels: 1,
    tones: ['body', 'shadow', 'highlight'],
  }),
  // F034 Macrourus berglax (Macrouridae), catalog fact 100-1000 m; pointed roughhead grenadier.
  fishProfileIcon('F034', {
    family: 'Macrouridae',
    bodyLength: 42,
    bodyHeight: 14,
    headShape: 'wedge',
    snoutLength: 6,
    jawSize: 1,
    tailKind: 'filament',
    dorsalKind: 'low',
    eyeSize: 4,
    photophorePattern: 'none',
    barbels: 0,
    tones: ['silverBlue', 'navy', 'pale'],
  }),
  // F035 Antimora rostrata (Moridae), catalog fact 350-3000 m; long-snouted blue antimora.
  fishProfileIcon('F035', {
    family: 'Moridae',
    bodyLength: 35,
    bodyHeight: 16,
    headShape: 'tapered',
    snoutLength: 5,
    jawSize: 2,
    tailKind: 'tapered',
    dorsalKind: 'double',
    eyeSize: 4,
    photophorePattern: 'none',
    barbels: 1,
    tones: ['navy', 'silverBlue', 'accent'],
  }),
  // F036 Mora moro (Moridae), catalog fact 50-2500 m; big-eyed common mora with indented anal profile.
  fishProfileIcon('F036', {
    family: 'Moridae',
    bodyLength: 34,
    bodyHeight: 18,
    headShape: 'round',
    snoutLength: 2,
    jawSize: 2,
    tailKind: 'forked',
    dorsalKind: 'rear',
    eyeSize: 6,
    photophorePattern: 'none',
    barbels: 1,
    tones: ['silverBlue', 'shadow', 'highlight'],
  }),
  // F037 Hoplostethus atlanticus (Trachichthyidae), catalog fact 180-1809 m; short deep orange roughy.
  fishProfileIcon('F037', {
    family: 'Trachichthyidae',
    bodyLength: 27,
    bodyHeight: 19,
    headShape: 'deep',
    snoutLength: 2,
    jawSize: 5,
    tailKind: 'small_lobe',
    dorsalKind: 'spiny',
    eyeSize: 4,
    photophorePattern: 'throat',
    barbels: 0,
    tones: ['blackBrown', 'magenta', 'yellow'],
  }),
  // F038 Beryx splendens (Berycidae), catalog fact 25-1300 m; large red-orange alfonsino with spiny dorsal.
  fishProfileIcon('F038', {
    family: 'Berycidae',
    bodyLength: 30,
    bodyHeight: 22,
    headShape: 'barrel',
    snoutLength: 2,
    jawSize: 3,
    tailKind: 'forked',
    dorsalKind: 'high',
    eyeSize: 6,
    photophorePattern: 'none',
    barbels: 0,
    tones: ['magenta', 'warning', 'highlight'],
  }),
  // F039 Aphanopus carbo (Trichiuridae), catalog fact 200-2300 m; extremely long black scabbardfish.
  fishProfileIcon('F039', {
    family: 'Trichiuridae',
    bodyLength: 44,
    bodyHeight: 10,
    headShape: 'beak',
    snoutLength: 8,
    jawSize: 7,
    tailKind: 'ribbon',
    dorsalKind: 'high',
    eyeSize: 3,
    photophorePattern: 'none',
    barbels: 0,
    tones: ['blackBrown', 'purple', 'ivory'],
  }),
  // F040 Psychrolutes phrictus (Psychrolutidae), catalog fact 500-2800 m; soft blob sculpin with cirri.
  fishProfileIcon('F040', {
    family: 'Psychrolutidae',
    bodyLength: 26,
    bodyHeight: 21,
    headShape: 'blunt',
    snoutLength: 1,
    jawSize: 5,
    tailKind: 'disc',
    dorsalKind: 'none',
    eyeSize: 3,
    photophorePattern: 'blotches',
    barbels: 2,
    tones: ['pale', 'shadow', 'highlight'],
  }),
  // F041 Melanocetus johnsonii (Melanocetidae), catalog fact 100-4500 m; humpback anglerfish with lure.
  fishProfileIcon('F041', {
    family: 'Melanocetidae',
    bodyLength: 25,
    bodyHeight: 23,
    headShape: 'deep',
    snoutLength: 2,
    jawSize: 8,
    tailKind: 'small_lobe',
    dorsalKind: 'lure',
    eyeSize: 3,
    photophorePattern: 'throat',
    barbels: 1,
    tones: ['dark', 'blackBrown', 'warning'],
  }),
  // F042 Himantolophus groenlandicus (Himantolophidae), catalog fact 200-1830 m; footballfish and thick esca stalk.
  fishProfileIcon('F042', {
    family: 'Himantolophidae',
    bodyLength: 29,
    bodyHeight: 22,
    headShape: 'round',
    snoutLength: 1,
    jawSize: 7,
    tailKind: 'small_lobe',
    dorsalKind: 'lure',
    eyeSize: 4,
    photophorePattern: 'green',
    barbels: 0,
    tones: ['blackBrown', 'purple', 'yellow'],
  }),
  // F043 Linophryne arborifera (Linophrynidae), catalog fact 200-1000 m; tiny angler with branched appendages.
  fishProfileIcon('F043', {
    family: 'Linophrynidae',
    bodyLength: 22,
    bodyHeight: 17,
    headShape: 'dome',
    snoutLength: 2,
    jawSize: 5,
    tailKind: 'tapered',
    dorsalKind: 'lure',
    eyeSize: 3,
    photophorePattern: 'chain',
    barbels: 3,
    tones: ['dark', 'magenta', 'warning'],
  }),
  // F044 Ceratias holboelli (Ceratiidae), catalog fact 400-4400 m; warty angler with luminous lure.
  fishProfileIcon('F044', {
    family: 'Ceratiidae',
    bodyLength: 32,
    bodyHeight: 24,
    headShape: 'barrel',
    snoutLength: 3,
    jawSize: 9,
    tailKind: 'small_lobe',
    dorsalKind: 'lure',
    eyeSize: 4,
    photophorePattern: 'spots',
    barbels: 2,
    tones: ['blackBrown', 'warning', 'yellow'],
  }),
  // F045 Chimaera monstrosa (Chimaeridae), catalog fact 40-1400 m; elongate rabbit fish with broad pectorals.
  fishProfileIcon('F045', {
    family: 'Chimaeridae',
    bodyLength: 38,
    bodyHeight: 15,
    headShape: 'wedge',
    snoutLength: 3,
    jawSize: 2,
    tailKind: 'filament',
    dorsalKind: 'single',
    eyeSize: 4,
    photophorePattern: 'none',
    barbels: 0,
    tones: ['pale', 'accent', 'highlight'],
  }),
  // F046 Hydrolagus colliei (Chimaeridae), catalog fact 0-913 m; blunt spotted ratfish with dorsal spine.
  fishProfileIcon('F046', {
    family: 'Chimaeridae',
    bodyLength: 34,
    bodyHeight: 16,
    headShape: 'blunt',
    snoutLength: 1,
    jawSize: 2,
    tailKind: 'small_lobe',
    dorsalKind: 'single',
    eyeSize: 4,
    photophorePattern: 'spots',
    barbels: 0,
    tones: ['blackBrown', 'magenta', 'white'],
  }),
  // F047 Harriotta raleighana (Rhinochimaeridae), catalog fact 200-3100 m; longnose chimaera with tail filament.
  fishProfileIcon('F047', {
    family: 'Rhinochimaeridae',
    bodyLength: 42,
    bodyHeight: 13,
    headShape: 'beak',
    snoutLength: 10,
    jawSize: 2,
    tailKind: 'filament',
    dorsalKind: 'low',
    eyeSize: 4,
    photophorePattern: 'none',
    barbels: 1,
    tones: ['silverBlue', 'navy', 'highlight'],
  }),
  // F048 Etmopterus spinax (Etmopteridae), catalog fact 70-2490 m; slender velvet-belly lantern shark.
  fishProfileIcon('F048', {
    family: 'Etmopteridae',
    bodyLength: 36,
    bodyHeight: 11,
    headShape: 'wedge',
    snoutLength: 3,
    jawSize: 2,
    tailKind: 'forked',
    dorsalKind: 'spiny',
    eyeSize: 3,
    photophorePattern: 'belly',
    barbels: 0,
    tones: ['dark', 'blackBrown', 'yellow'],
  }),
  // F049 Etmopterus perryi (Etmopteridae), catalog fact 230-530 m; tiny flattened dwarf lantern shark.
  fishProfileIcon('F049', {
    family: 'Etmopteridae',
    bodyLength: 24,
    bodyHeight: 10,
    headShape: 'flat',
    snoutLength: 2,
    jawSize: 1,
    tailKind: 'forked',
    dorsalKind: 'spiny',
    eyeSize: 3,
    photophorePattern: 'blotches',
    barbels: 0,
    tones: ['blackBrown', 'navy', 'white'],
  }),
  // F050 Centroscyllium fabricii (Etmopteridae), catalog fact 180-2250 m; black dogfish with light organs.
  fishProfileIcon('F050', {
    family: 'Etmopteridae',
    bodyLength: 38,
    bodyHeight: 13,
    headShape: 'tapered',
    snoutLength: 2,
    jawSize: 2,
    tailKind: 'tapered',
    dorsalKind: 'spiny',
    eyeSize: 4,
    photophorePattern: 'chain',
    barbels: 0,
    tones: ['dark', 'blackBrown', 'highlight'],
  }),
  // F051 Centroscymnus coelolepis (Somniosidae), catalog fact 128-3700 m; dark Portuguese dogfish.
  fishProfileIcon('F051', {
    family: 'Somniosidae',
    bodyLength: 37,
    bodyHeight: 15,
    headShape: 'wedge',
    snoutLength: 3,
    jawSize: 3,
    tailKind: 'small_lobe',
    dorsalKind: 'spiny',
    eyeSize: 4,
    photophorePattern: 'none',
    barbels: 0,
    tones: ['blackBrown', 'navy', 'pale'],
  }),
  // F052 Somniosus microcephalus (Somniosidae), catalog fact 0-2992 m; huge heavy-bodied Greenland shark.
  fishProfileIcon('F052', {
    family: 'Somniosidae',
    bodyLength: 43,
    bodyHeight: 22,
    headShape: 'round',
    snoutLength: 1,
    jawSize: 3,
    tailKind: 'small_lobe',
    dorsalKind: 'double',
    eyeSize: 5,
    photophorePattern: 'none',
    barbels: 0,
    tones: ['shadow', 'blackBrown', 'silverBlue'],
  }),
  // F053 Chlamydoselachus anguineus (Chlamydoselachidae), catalog fact 0-1570 m; eel-like frilled shark.
  fishProfileIcon('F053', {
    family: 'Chlamydoselachidae',
    bodyLength: 43,
    bodyHeight: 9,
    headShape: 'tapered',
    snoutLength: 2,
    jawSize: 1,
    tailKind: 'eel',
    dorsalKind: 'far_rear',
    eyeSize: 3,
    photophorePattern: 'bands',
    barbels: 0,
    tones: ['blackBrown', 'magenta', 'accent'],
  }),
  // F054 Mitsukurina owstoni (Mitsukurinidae), catalog fact 30-1300 m; pink goblin shark with blade snout.
  fishProfileIcon('F054', {
    family: 'Mitsukurinidae',
    bodyLength: 42,
    bodyHeight: 15,
    headShape: 'flat',
    snoutLength: 10,
    jawSize: 9,
    tailKind: 'filament',
    dorsalKind: 'rear',
    eyeSize: 4,
    photophorePattern: 'gill_slits',
    barbels: 0,
    tones: ['pale', 'magenta', 'ivory'],
  }),
  // F055 Pseudotriakis microdon (Pseudotriakidae), catalog fact 173-1890 m; large false catshark.
  fishProfileIcon('F055', {
    family: 'Pseudotriakidae',
    bodyLength: 40,
    bodyHeight: 17,
    headShape: 'wedge',
    snoutLength: 4,
    jawSize: 5,
    tailKind: 'small_lobe',
    dorsalKind: 'rear',
    eyeSize: 3,
    photophorePattern: 'spots',
    barbels: 0,
    tones: ['blackBrown', 'shadow', 'ivory'],
  }),
  // F056 Hexanchus griseus (Hexanchidae), catalog fact 0-2500 m; broad-headed sixgill shark.
  fishProfileIcon('F056', {
    family: 'Hexanchidae',
    bodyLength: 43,
    bodyHeight: 21,
    headShape: 'blunt',
    snoutLength: 2,
    jawSize: 4,
    tailKind: 'small_lobe',
    dorsalKind: 'far_rear',
    eyeSize: 5,
    photophorePattern: 'gill_slits',
    barbels: 0,
    tones: ['shadow', 'silverBlue', 'highlight'],
  }),
  // F057 Amblyraja hyperborea (Rajidae), catalog fact 92-2925 m; flat Arctic skate with blotches and thorns.
  fishProfileIcon('F057', {
    family: 'Rajidae',
    bodyLength: 35,
    bodyHeight: 22,
    headShape: 'disc',
    snoutLength: 1,
    jawSize: 0,
    tailKind: 'disc',
    dorsalKind: 'none',
    eyeSize: 3,
    photophorePattern: 'blotches',
    barbels: 0,
    tones: ['pale', 'navy', 'magenta'],
  }),
] as const;

export const FISH_SPECIES_PIXEL_ICONS = SPECIES_FISH_PIXEL_ICONS;
