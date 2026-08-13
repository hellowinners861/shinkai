import type { SpeciesPixelIconDefinition } from '../model';
import type { PixelTone } from '../palette';
import { defineSpeciesIcon, rect } from '../primitives';

type OctopusFinKind = 'none' | 'ear';

type OctopusIconProfile = {
  readonly mantleWidth: number;
  readonly mantleHeight: number;
  readonly armLengths: readonly [number, number, number, number];
  readonly webDepth: number;
  readonly finKind: OctopusFinKind;
  readonly eyeTone: PixelTone;
  readonly bodyTone: PixelTone;
  readonly accentTone: PixelTone;
  readonly photophore: boolean;
};

function octopusIcon(
  sourceId: string,
  profile: OctopusIconProfile,
): SpeciesPixelIconDefinition {
  const halfMantleWidth = Math.floor(profile.mantleWidth / 2);
  const mantleTop = -profile.mantleHeight - 6;
  const crownWidth = Math.max(8, profile.mantleWidth - 8);
  const shoulderWidth = Math.max(crownWidth, profile.mantleWidth - 4);
  const bellyWidth = Math.max(8, profile.mantleWidth - 2);
  const coreHeight = Math.max(4, profile.mantleHeight - 6);
  const eyeOffset = Math.max(4, Math.floor(profile.mantleWidth / 4));
  const eyeY = mantleTop + Math.max(5, Math.floor(profile.mantleHeight * 0.45));
  const webY = -2;
  const armY = webY + profile.webDepth - 1;
  const armXs: readonly [number, number, number, number] = [
    -halfMantleWidth - 3,
    -6,
    2,
    halfMantleWidth - 1,
  ];
  const [leftOuterLength, leftInnerLength, rightInnerLength, rightOuterLength] =
    profile.armLengths;

  const rectangles = [
    rect(
      -Math.floor(crownWidth / 2),
      mantleTop,
      crownWidth,
      3,
      profile.accentTone,
      0.72,
    ),
    rect(
      -Math.floor(shoulderWidth / 2),
      mantleTop + 3,
      shoulderWidth,
      3,
      profile.bodyTone,
    ),
    rect(
      -halfMantleWidth,
      mantleTop + 6,
      profile.mantleWidth,
      coreHeight,
      profile.bodyTone,
    ),
    rect(
      -Math.floor(bellyWidth / 2),
      mantleTop + profile.mantleHeight,
      bellyWidth,
      4,
      profile.accentTone,
      0.9,
    ),
    rect(-eyeOffset - 2, eyeY, 4, 4, profile.eyeTone),
    rect(eyeOffset - 2, eyeY, 4, 4, profile.eyeTone),
    rect(-eyeOffset - 1, eyeY + 1, 1, 1, 'highlight', 0.9),
    rect(eyeOffset - 1, eyeY + 1, 1, 1, 'highlight', 0.9),
  ];

  if (profile.finKind === 'ear') {
    const finHeight = Math.max(8, Math.floor(profile.mantleHeight * 0.55));
    const finY = mantleTop + Math.max(4, Math.floor(profile.mantleHeight * 0.28));
    rectangles.push(
      rect(-halfMantleWidth - 6, finY, 6, finHeight, profile.accentTone, 0.86),
      rect(halfMantleWidth, finY, 6, finHeight, profile.accentTone, 0.86),
      rect(
        -halfMantleWidth - 8,
        finY + 2,
        2,
        Math.max(4, finHeight - 4),
        profile.bodyTone,
        0.55,
      ),
      rect(
        halfMantleWidth + 6,
        finY + 2,
        2,
        Math.max(4, finHeight - 4),
        profile.bodyTone,
        0.55,
      ),
    );
  }

  rectangles.push(
    rect(
      -halfMantleWidth - 6,
      webY,
      profile.mantleWidth + 12,
      profile.webDepth,
      profile.accentTone,
      0.68,
    ),
    rect(
      -halfMantleWidth - 4,
      webY + profile.webDepth - 2,
      profile.mantleWidth + 8,
      2,
      profile.bodyTone,
      0.55,
    ),
  );

  const arms = [
    { x: armXs[0], length: leftOuterLength, direction: -1, tone: profile.bodyTone },
    { x: armXs[1], length: leftInnerLength, direction: -1, tone: profile.accentTone },
    { x: armXs[2], length: rightInnerLength, direction: 1, tone: profile.accentTone },
    { x: armXs[3], length: rightOuterLength, direction: 1, tone: profile.bodyTone },
  ] as const;

  for (const arm of arms) {
    const bend = Math.min(4, Math.max(2, Math.floor(arm.length / 4)));
    const straightHeight = arm.length - bend;
    rectangles.push(
      rect(arm.x, armY, 4, straightHeight, arm.tone, 0.92),
      rect(
        arm.x + arm.direction * 2,
        armY + straightHeight - 2,
        4,
        bend + 2,
        profile.accentTone,
        0.88,
      ),
    );
  }

  if (profile.photophore) {
    const photophoreTone: PixelTone = 'yellow';
    const photophoreY = mantleTop + profile.mantleHeight - 4;
    rectangles.push(
      rect(-halfMantleWidth + 3, photophoreY, 3, 3, photophoreTone),
      rect(halfMantleWidth - 6, photophoreY, 3, 3, photophoreTone),
      rect(armXs[0] + 1, armY + leftOuterLength - 3, 2, 2, photophoreTone),
      rect(armXs[3] + 1, armY + rightOuterLength - 3, 2, 2, photophoreTone),
    );
  }

  return defineSpeciesIcon(sourceId, 'octopus', 0, rectangles);
}

/** Species-specific squid icons keyed to the generated catalog IDs. */
export const SPECIES_CEPHALOPOD_PIXEL_ICONS: readonly SpeciesPixelIconDefinition[] = [
  // Architeuthis dux: long mantle, paired fins, and very long feeding tentacles with clubs.
  defineSpeciesIcon('I021', 'squid', 0, [
    rect(-8, -22, 16, 4, 'shadow'),
    rect(-12, -18, 24, 20, 'body'),
    rect(-8, 2, 16, 6, 'body'),
    rect(-20, -10, 8, 10, 'accent'),
    rect(12, -10, 8, 10, 'accent'),
    rect(-8, -12, 4, 4, 'dark'),
    rect(4, -12, 4, 4, 'dark'),
    rect(-7, -11, 2, 2, 'highlight'),
    rect(5, -11, 2, 2, 'highlight'),
    rect(-16, 8, 8, 4, 'accent'),
    rect(8, 8, 8, 4, 'accent'),
    rect(-24, 12, 12, 4, 'body'),
    rect(12, 12, 12, 4, 'body'),
    rect(-30, 16, 8, 8, 'magenta'),
    rect(22, 16, 8, 8, 'magenta'),
    rect(-28, 18, 4, 4, 'warning'),
    rect(24, 18, 4, 4, 'warning'),
  ]),
  // Mesonychoteuthis hamiltoni: broad mantle, huge eyes, and hooked tentacle clubs.
  defineSpeciesIcon('I022', 'squid', 0, [
    rect(-20, -16, 32, 4, 'shadow'),
    rect(-24, -14, 48, 20, 'blackBrown'),
    rect(-20, 6, 40, 6, 'purple'),
    rect(-28, -8, 8, 12, 'purple'),
    rect(20, -8, 8, 12, 'purple'),
    rect(-16, -10, 12, 12, 'navy'),
    rect(4, -10, 12, 12, 'navy'),
    rect(-12, -6, 4, 4, 'highlight'),
    rect(8, -6, 4, 4, 'highlight'),
    rect(-20, 12, 12, 4, 'body'),
    rect(8, 12, 12, 4, 'body'),
    rect(-28, 16, 12, 4, 'body'),
    rect(16, 16, 12, 4, 'body'),
    rect(-24, 20, 8, 8, 'ivory'),
    rect(16, 20, 8, 8, 'ivory'),
    rect(-20, 22, 4, 4, 'warning'),
    rect(16, 22, 4, 4, 'warning'),
  ]),
  // Magnapinna atlantica: short mantle, small fins, and metre-long right-angle filaments.
  defineSpeciesIcon('I023', 'squid', 0, [
    rect(-8, -12, 16, 4, 'shadow'),
    rect(-12, -8, 24, 10, 'silverBlue', 0.75),
    rect(-8, 2, 16, 4, 'accent', 0.65),
    rect(-18, -6, 6, 8, 'accent'),
    rect(12, -6, 6, 8, 'accent'),
    rect(-8, -6, 4, 4, 'dark'),
    rect(4, -6, 4, 4, 'dark'),
    rect(-4, -5, 2, 2, 'highlight'),
    rect(-20, 6, 4, 12, 'purple', 0.8),
    rect(-24, 18, 4, 10, 'purple', 0.7),
    rect(-20, 26, 12, 4, 'purple', 0.7),
    rect(16, 6, 4, 12, 'purple', 0.8),
    rect(16, 18, 4, 10, 'purple', 0.7),
    rect(20, 26, 12, 4, 'purple', 0.7),
    rect(-12, 10, 4, 8, 'magenta', 0.6),
    rect(8, 10, 4, 8, 'magenta', 0.6),
    rect(-22, 10, 4, 4, 'warning', 0.8),
    rect(18, 10, 4, 4, 'warning', 0.8),
  ]),
  // Vampyroteuthis infernalis: compact dark mantle, red webbed arms, blue eyes, and photophores.
  defineSpeciesIcon('I024', 'squid', 0, [
    rect(-10, -16, 20, 4, 'shadow'),
    rect(-16, -12, 32, 18, 'blackBrown'),
    rect(-12, 6, 24, 6, 'purple'),
    rect(-24, -8, 8, 12, 'magenta', 0.85),
    rect(16, -8, 8, 12, 'magenta', 0.85),
    rect(-10, -8, 8, 10, 'navy'),
    rect(2, -8, 8, 10, 'navy'),
    rect(-8, -5, 4, 4, 'highlight'),
    rect(4, -5, 4, 4, 'highlight'),
    rect(-20, 8, 12, 6, 'magenta', 0.8),
    rect(8, 8, 12, 6, 'magenta', 0.8),
    rect(-24, 14, 8, 6, 'magenta', 0.75),
    rect(16, 14, 8, 6, 'magenta', 0.75),
    rect(-14, 10, 4, 4, 'warning'),
    rect(10, 10, 4, 4, 'warning'),
    rect(-18, 18, 4, 4, 'warning'),
    rect(14, 18, 4, 4, 'warning'),
    rect(-2, 10, 4, 4, 'warning'),
  ]),
  // Histioteuthis reversa: asymmetric fins and eyes with a mantle dense with photophores.
  defineSpeciesIcon('I025', 'squid', 0, [
    rect(-13, -16, 26, 4, 'shadow'),
    rect(-17, -12, 34, 18, 'purple', 0.9),
    rect(-13, 6, 26, 5, 'body', 0.85),
    rect(-22, -8, 6, 10, 'accent'),
    rect(16, -8, 8, 10, 'accent'),
    rect(-13, -8, 10, 10, 'navy'),
    rect(7, -5, 5, 5, 'navy'),
    rect(-10, -5, 4, 4, 'highlight'),
    rect(8, -4, 2, 2, 'highlight'),
    rect(-16, 10, 8, 4, 'body'),
    rect(8, 10, 8, 4, 'body'),
    rect(-22, 14, 8, 4, 'accent'),
    rect(14, 14, 8, 4, 'accent'),
    rect(-12, 4, 4, 4, 'warning'),
    rect(-4, 6, 4, 4, 'yellow'),
    rect(4, 4, 4, 4, 'warning'),
    rect(12, 6, 4, 4, 'yellow'),
    rect(-2, 12, 4, 4, 'yellow'),
  ]),
  // Histioteuthis heteropsis: strawberry-red mantle, one enlarged eye, and photophore studs.
  defineSpeciesIcon('I026', 'squid', 0, [
    rect(-10, -18, 20, 4, 'shadow'),
    rect(-15, -14, 30, 18, 'magenta'),
    rect(-11, 4, 22, 7, 'purple'),
    rect(-21, -8, 6, 12, 'accent'),
    rect(15, -8, 10, 8, 'accent'),
    rect(-4, -10, 12, 14, 'navy'),
    rect(-1, -6, 6, 6, 'highlight'),
    rect(-10, -7, 5, 5, 'dark'),
    rect(-18, 10, 10, 4, 'purple'),
    rect(8, 10, 10, 4, 'purple'),
    rect(-24, 14, 8, 5, 'magenta'),
    rect(16, 14, 8, 5, 'magenta'),
    rect(-13, 2, 4, 4, 'warning'),
    rect(-6, 7, 4, 4, 'yellow'),
    rect(2, 5, 4, 4, 'warning'),
    rect(10, 8, 4, 4, 'yellow'),
    rect(-2, 14, 4, 4, 'warning'),
  ]),
  // Taningia danae: broad mantle, short fins, stout arms, and two huge arm-tip photophores.
  defineSpeciesIcon('I027', 'squid', 0, [
    rect(-16, -18, 32, 4, 'shadow'),
    rect(-22, -14, 44, 18, 'body'),
    rect(-18, 4, 36, 7, 'purple'),
    rect(-28, -8, 8, 10, 'accent'),
    rect(20, -8, 8, 10, 'accent'),
    rect(-6, -7, 4, 4, 'dark'),
    rect(2, -7, 4, 4, 'dark'),
    rect(-24, 10, 12, 5, 'magenta'),
    rect(12, 10, 12, 5, 'magenta'),
    rect(-32, 15, 12, 6, 'magenta'),
    rect(20, 15, 12, 6, 'magenta'),
    rect(-36, 17, 10, 10, 'warning'),
    rect(26, 17, 10, 10, 'warning'),
    rect(-33, 20, 4, 4, 'white'),
    rect(29, 20, 4, 4, 'white'),
    rect(-12, 10, 4, 4, 'accent'),
    rect(8, 10, 4, 4, 'accent'),
  ]),
  // Taonius pavo: long gelatinous mantle, large eyes, narrow fins, and trailing translucent arms.
  defineSpeciesIcon('I028', 'squid', 0, [
    rect(-10, -20, 20, 4, 'highlight', 0.65),
    rect(-17, -16, 34, 20, 'pale', 0.3),
    rect(-13, 4, 26, 7, 'silverBlue', 0.25),
    rect(-22, -8, 5, 10, 'silverBlue', 0.45),
    rect(17, -8, 5, 10, 'silverBlue', 0.45),
    rect(-12, -9, 9, 11, 'navy'),
    rect(3, -9, 9, 11, 'navy'),
    rect(-9, -6, 4, 4, 'accent'),
    rect(6, -6, 4, 4, 'accent'),
    rect(-18, 10, 4, 10, 'accent', 0.45),
    rect(-10, 12, 4, 14, 'accent', 0.35),
    rect(6, 12, 4, 14, 'accent', 0.35),
    rect(14, 10, 4, 10, 'accent', 0.45),
    rect(-4, 9, 8, 4, 'warning', 0.4),
    rect(-20, 2, 4, 4, 'magenta', 0.5),
    rect(16, 2, 4, 4, 'magenta', 0.5),
  ]),
  // Galiteuthis phyllura: gelatinous transparent mantle with a long pointed tail.
  defineSpeciesIcon('I029', 'squid', 0, [
    rect(-10, -20, 20, 4, 'highlight', 0.55),
    rect(-14, -16, 28, 4, 'pale', 0.35),
    rect(-18, -12, 36, 8, 'pale', 0.3),
    rect(-16, -4, 32, 8, 'pale', 0.28),
    rect(-12, 4, 24, 4, 'pale', 0.3),
    rect(-8, 8, 16, 4, 'pale', 0.35),
    rect(-22, -8, 4, 12, 'silverBlue', 0.4),
    rect(18, -8, 4, 12, 'silverBlue', 0.4),
    rect(-14, 0, 4, 8, 'silverBlue', 0.35),
    rect(10, 0, 4, 8, 'silverBlue', 0.35),
    rect(-4, 12, 8, 4, 'silverBlue', 0.45),
    rect(-2, 16, 4, 8, 'silverBlue', 0.5),
    rect(-6, -8, 4, 4, 'highlight', 0.6),
    rect(2, -8, 4, 4, 'highlight', 0.6),
  ]),
  // Gonatus onyx: muscular dark mantle with hooks on the arms.
  defineSpeciesIcon('I030', 'squid', 0, [
    rect(-14, -16, 28, 4, 'blackBrown'),
    rect(-18, -12, 36, 16, 'blackBrown'),
    rect(-14, 4, 28, 6, 'purple'),
    rect(-22, -8, 4, 12, 'purple'),
    rect(18, -8, 4, 12, 'purple'),
    rect(-10, 10, 8, 4, 'purple'),
    rect(2, 10, 8, 4, 'purple'),
    rect(-24, 8, 8, 4, 'blackBrown'),
    rect(16, 8, 8, 4, 'blackBrown'),
    rect(-28, 12, 8, 4, 'blackBrown'),
    rect(20, 12, 8, 4, 'blackBrown'),
    rect(-30, 16, 8, 4, 'warning'),
    rect(22, 16, 8, 4, 'warning'),
    rect(-10, 14, 4, 4, 'warning'),
    rect(6, 14, 4, 4, 'warning'),
  ]),
  // Chiroteuthis calyx: elongate neck and tail with oversized eyes.
  defineSpeciesIcon('I031', 'squid', 0, [
    rect(-8, -22, 16, 4, 'silverBlue'),
    rect(-12, -18, 24, 4, 'silverBlue'),
    rect(-10, -14, 20, 8, 'silverBlue'),
    rect(-6, -6, 12, 12, 'silverBlue'),
    rect(-4, 6, 8, 8, 'silverBlue'),
    rect(-2, 14, 4, 8, 'silverBlue'),
    rect(-18, -12, 8, 12, 'navy'),
    rect(10, -12, 8, 12, 'navy'),
    rect(-16, -8, 4, 4, 'highlight'),
    rect(12, -8, 4, 4, 'highlight'),
    rect(-12, 16, 4, 4, 'navy'),
    rect(8, 16, 4, 4, 'navy'),
  ]),
  // Bathyteuthis abyssicola: compact pointed mantle with broad fins and stout arms.
  defineSpeciesIcon('I032', 'squid', 0, [
    rect(-8, -18, 16, 4, 'body'),
    rect(-12, -14, 24, 4, 'body'),
    rect(-16, -10, 32, 12, 'body'),
    rect(-12, 2, 24, 6, 'body'),
    rect(-20, -8, 8, 12, 'accent'),
    rect(12, -8, 8, 12, 'accent'),
    rect(-24, -4, 4, 8, 'accent'),
    rect(20, -4, 4, 8, 'accent'),
    rect(-16, 8, 8, 4, 'accent'),
    rect(8, 8, 8, 4, 'accent'),
    rect(-22, 12, 12, 6, 'accent'),
    rect(10, 12, 12, 6, 'accent'),
    rect(-26, 16, 8, 4, 'warning'),
    rect(18, 16, 8, 4, 'warning'),
  ]),
  // Joubiniteuthis portieri: slender squid with a pointed tail and long tentacles.
  defineSpeciesIcon('I033', 'squid', 0, [
    rect(-8, -20, 16, 4, 'shadow'),
    rect(-12, -16, 24, 16, 'body'),
    rect(-8, 0, 16, 4, 'purple'),
    rect(-16, -8, 4, 10, 'accent'),
    rect(12, -8, 4, 10, 'accent'),
    rect(-4, -10, 8, 6, 'navy'),
    rect(-2, -8, 4, 2, 'highlight'),
    rect(-8, 4, 16, 4, 'body'),
    rect(-6, 8, 12, 4, 'purple'),
    rect(-4, 12, 8, 4, 'body'),
    rect(-2, 16, 4, 4, 'body'),
    rect(-24, 8, 4, 12, 'accent'),
    rect(20, 8, 4, 12, 'accent'),
    rect(-28, 20, 12, 4, 'accent'),
    rect(24, 20, 12, 4, 'accent'),
    rect(-28, 24, 8, 4, 'warning'),
    rect(28, 24, 8, 4, 'warning'),
  ]),
  // Mastigoteuthis flammea: slender body with whip-like elongate tentacles.
  defineSpeciesIcon('I034', 'squid', 0, [
    rect(-8, -22, 16, 4, 'shadow'),
    rect(-12, -18, 24, 20, 'magenta'),
    rect(-8, 2, 16, 4, 'body'),
    rect(-16, -8, 4, 12, 'accent'),
    rect(12, -8, 4, 12, 'accent'),
    rect(-4, -10, 8, 6, 'navy'),
    rect(-2, -8, 4, 2, 'highlight'),
    rect(-12, 6, 8, 4, 'purple'),
    rect(4, 6, 8, 4, 'purple'),
    rect(-20, 10, 4, 10, 'magenta'),
    rect(-24, 20, 4, 10, 'warning'),
    rect(-20, 30, 4, 8, 'accent'),
    rect(16, 10, 4, 12, 'magenta'),
    rect(20, 22, 4, 8, 'warning'),
    rect(16, 30, 4, 6, 'accent'),
    rect(-24, 38, 8, 4, 'yellow'),
  ]),
  // Octopoteuthis deletron: tapered mantle, octopus-like arms, and luminous tissues.
  defineSpeciesIcon('I035', 'squid', 0, [
    rect(-8, -20, 16, 4, 'shadow'),
    rect(-12, -16, 24, 12, 'body'),
    rect(-8, -4, 16, 4, 'purple'),
    rect(-6, 0, 12, 4, 'body'),
    rect(-4, 4, 8, 4, 'body'),
    rect(-18, -8, 6, 12, 'accent'),
    rect(12, -8, 6, 12, 'accent'),
    rect(-24, 4, 6, 8, 'body'),
    rect(18, 4, 6, 8, 'body'),
    rect(-28, 12, 8, 4, 'accent'),
    rect(20, 12, 8, 4, 'accent'),
    rect(-20, 16, 4, 10, 'magenta'),
    rect(-8, 16, 4, 12, 'magenta'),
    rect(4, 16, 4, 12, 'magenta'),
    rect(16, 16, 4, 10, 'magenta'),
    rect(-20, 18, 4, 4, 'warning'),
    rect(-8, 20, 4, 4, 'warning'),
    rect(4, 20, 4, 4, 'warning'),
  ]),
  // Ancistrocheirus lesueurii: muscular reddish mantle, large eyes, and arm hooks.
  defineSpeciesIcon('I036', 'squid', 0, [
    rect(-14, -18, 28, 4, 'shadow'),
    rect(-20, -14, 40, 18, 'magenta'),
    rect(-16, 4, 32, 6, 'purple'),
    rect(-24, -8, 8, 12, 'body'),
    rect(16, -8, 8, 12, 'body'),
    rect(-14, -8, 10, 12, 'navy'),
    rect(4, -8, 10, 12, 'navy'),
    rect(-12, -6, 4, 4, 'highlight'),
    rect(6, -6, 4, 4, 'highlight'),
    rect(-24, 8, 10, 6, 'accent'),
    rect(14, 8, 10, 6, 'accent'),
    rect(-30, 14, 8, 4, 'body'),
    rect(22, 14, 8, 4, 'body'),
    rect(-28, 18, 4, 8, 'ivory'),
    rect(24, 18, 4, 8, 'ivory'),
    rect(-4, 10, 8, 4, 'warning'),
  ]),

  // Graneledone boreopacifica: soft warty skin and eight stout finless arms.
  octopusIcon('I037', {
    mantleWidth: 22,
    mantleHeight: 16,
    armLengths: [14, 16, 16, 13],
    webDepth: 8,
    finKind: 'none',
    eyeTone: 'warning',
    bodyTone: 'purple',
    accentTone: 'accent',
    photophore: false,
  }),

  // Graneledone verrucosa: warty mantle and robust benthic arms.
  octopusIcon('I038', {
    mantleWidth: 24,
    mantleHeight: 18,
    armLengths: [18, 15, 17, 16],
    webDepth: 6,
    finKind: 'none',
    eyeTone: 'highlight',
    bodyTone: 'blackBrown',
    accentTone: 'magenta',
    photophore: false,
  }),

  // Grimpoteuthis bathynectes: large ear-like fins and webbed arms with cirri.
  octopusIcon('I039', {
    mantleWidth: 18,
    mantleHeight: 14,
    armLengths: [13, 20, 18, 14],
    webDepth: 10,
    finKind: 'ear',
    eyeTone: 'white',
    bodyTone: 'silverBlue',
    accentTone: 'pale',
    photophore: false,
  }),

  // Grimpoteuthis imperator: broad lateral fins and a deep umbrella-like web.
  octopusIcon('I040', {
    mantleWidth: 26,
    mantleHeight: 18,
    armLengths: [17, 21, 19, 22],
    webDepth: 12,
    finKind: 'ear',
    eyeTone: 'yellow',
    bodyTone: 'body',
    accentTone: 'purple',
    photophore: false,
  }),

  // Grimpoteuthis discoveryi: soft mantle, ear-like fins, and cirrate webbing.
  octopusIcon('I041', {
    mantleWidth: 20,
    mantleHeight: 16,
    armLengths: [15, 22, 20, 16],
    webDepth: 9,
    finKind: 'ear',
    eyeTone: 'highlight',
    bodyTone: 'pale',
    accentTone: 'silverBlue',
    photophore: false,
  }),

  // Cirroteuthis muelleri: large fins, extensive webbing, and long cirri.
  octopusIcon('I042', {
    mantleWidth: 24,
    mantleHeight: 20,
    armLengths: [22, 18, 24, 20],
    webDepth: 10,
    finKind: 'ear',
    eyeTone: 'navy',
    bodyTone: 'silverBlue',
    accentTone: 'accent',
    photophore: false,
  }),

  // Cirrothauma murrayi: gelatinous body, reduced eyes, fins, and long webbed arms.
  octopusIcon('I043', {
    mantleWidth: 16,
    mantleHeight: 20,
    armLengths: [24, 26, 22, 25],
    webDepth: 7,
    finKind: 'ear',
    eyeTone: 'dark',
    bodyTone: 'pale',
    accentTone: 'highlight',
    photophore: false,
  }),

  // Opisthoteuthis agassizii: flattened flapjack body, fins, and a wide arm web.
  octopusIcon('I044', {
    mantleWidth: 28,
    mantleHeight: 12,
    armLengths: [14, 12, 13, 15],
    webDepth: 12,
    finKind: 'ear',
    eyeTone: 'white',
    bodyTone: 'magenta',
    accentTone: 'warning',
    photophore: false,
  }),

  // Stauroteuthis syrtensis: orange-red mantle, webbed arms, and luminous suckers.
  defineSpeciesIcon('I045', 'octopus', 0, [
    rect(-8, -18, 16, 4, 'magenta'),
    rect(-14, -14, 28, 14, 'magenta'),
    rect(-10, 0, 20, 5, 'magenta'),
    rect(-8, -7, 4, 4, 'navy'),
    rect(4, -7, 4, 4, 'navy'),
    rect(-7, -6, 2, 2, 'highlight'),
    rect(5, -6, 2, 2, 'highlight'),
    rect(-24, 5, 48, 6, 'purple', 0.72),
    rect(-27, 10, 8, 6, 'purple'),
    rect(-17, 12, 8, 6, 'purple'),
    rect(9, 12, 8, 6, 'purple'),
    rect(19, 10, 8, 6, 'purple'),
    rect(-24, 15, 3, 3, 'yellow'),
    rect(-14, 17, 3, 3, 'yellow'),
    rect(12, 17, 3, 3, 'yellow'),
    rect(22, 15, 3, 3, 'yellow'),
  ]),

  // Vulcanoctopus hydrothermalis: pale robust mantle, vent web, and short finless arms.
  defineSpeciesIcon('I046', 'octopus', 0, [
    rect(-10, -18, 20, 4, 'pale'),
    rect(-16, -14, 32, 14, 'pale'),
    rect(-18, 0, 36, 7, 'pale'),
    rect(-12, 7, 24, 4, 'pale'),
    rect(-10, -7, 6, 6, 'dark'),
    rect(4, -7, 6, 6, 'dark'),
    rect(-24, 5, 48, 5, 'accent', 0.55),
    rect(-28, 10, 14, 6, 'accent'),
    rect(-19, 15, 11, 6, 'accent'),
    rect(8, 15, 11, 6, 'accent'),
    rect(14, 10, 14, 6, 'accent'),
    rect(-22, 12, 4, 3, 'warning'),
    rect(18, 12, 4, 3, 'warning'),
  ]),

  // Muusoctopus robustus: high broad mantle, deep web, and separated stout benthic arms.
  defineSpeciesIcon('I047', 'octopus', 0, [
    rect(-12, -20, 24, 4, 'blackBrown'),
    rect(-18, -16, 36, 8, 'blackBrown'),
    rect(-22, -8, 44, 14, 'blackBrown'),
    rect(-16, 6, 32, 6, 'blackBrown'),
    rect(-10, -8, 6, 6, 'highlight'),
    rect(4, -8, 6, 6, 'highlight'),
    rect(-24, 6, 48, 5, 'purple', 0.45),
    rect(-30, 10, 12, 6, 'purple'),
    rect(-24, 16, 12, 6, 'purple'),
    rect(-18, 12, 10, 6, 'purple'),
    rect(-14, 18, 10, 6, 'purple'),
    rect(8, 12, 10, 6, 'purple'),
    rect(8, 18, 10, 6, 'purple'),
    rect(18, 10, 12, 6, 'purple'),
    rect(18, 16, 12, 6, 'purple'),
    rect(-26, 19, 4, 3, 'warning'),
    rect(22, 19, 4, 3, 'warning'),
  ]),

  // Muusoctopus leioderma: smooth mantle and long finless arms lined with suckers.
  defineSpeciesIcon('I048', 'octopus', 0, [
    rect(-8, -20, 16, 4, 'silverBlue'),
    rect(-14, -16, 28, 8, 'silverBlue'),
    rect(-16, -8, 32, 10, 'silverBlue'),
    rect(-12, 2, 24, 6, 'silverBlue'),
    rect(-9, -6, 5, 5, 'navy'),
    rect(4, -6, 5, 5, 'navy'),
    rect(-24, 8, 10, 4, 'body'),
    rect(-30, 12, 12, 4, 'body'),
    rect(-14, 10, 8, 4, 'body'),
    rect(-18, 14, 8, 4, 'body'),
    rect(10, 10, 8, 4, 'body'),
    rect(10, 14, 8, 4, 'body'),
    rect(14, 8, 10, 4, 'body'),
    rect(18, 12, 12, 4, 'body'),
    rect(-26, 17, 3, 3, 'highlight'),
    rect(-14, 19, 3, 3, 'highlight'),
    rect(14, 17, 3, 3, 'highlight'),
    rect(26, 19, 3, 3, 'highlight'),
  ]),

  // Japetella diaphana: broad transparent gelatinous mantle and oversized eyes.
  defineSpeciesIcon('I049', 'octopus', 0, [
    rect(-8, -18, 16, 4, 'pale', 0.22),
    rect(-14, -14, 28, 6, 'pale', 0.2),
    rect(-18, -8, 36, 12, 'pale', 0.18),
    rect(-12, 4, 24, 6, 'pale', 0.22),
    rect(-14, -6, 8, 10, 'navy'),
    rect(6, -6, 8, 10, 'navy'),
    rect(-11, -3, 3, 3, 'accent'),
    rect(9, -3, 3, 3, 'accent'),
    rect(-24, 8, 48, 4, 'silverBlue', 0.3),
    rect(-24, 12, 8, 4, 'silverBlue', 0.32),
    rect(-16, 16, 8, 4, 'silverBlue', 0.32),
    rect(8, 16, 8, 4, 'silverBlue', 0.32),
    rect(16, 12, 8, 4, 'silverBlue', 0.32),
  ]),

  // Vitreledonella richardi: tall glassy mantle, cylindrical eyes, and hanging arms.
  defineSpeciesIcon('I050', 'octopus', 0, [
    rect(-6, -24, 12, 4, 'pale', 0.22),
    rect(-10, -20, 20, 8, 'pale', 0.18),
    rect(-12, -12, 24, 12, 'pale', 0.18),
    rect(-8, 0, 16, 8, 'pale', 0.22),
    rect(-12, -14, 4, 12, 'navy'),
    rect(8, -14, 4, 12, 'navy'),
    rect(-11, -11, 2, 2, 'accent'),
    rect(9, -11, 2, 2, 'accent'),
    rect(-20, 8, 6, 4, 'accent', 0.4),
    rect(-24, 12, 8, 4, 'accent', 0.35),
    rect(14, 8, 6, 4, 'accent', 0.4),
    rect(16, 12, 8, 4, 'accent', 0.35),
    rect(-8, 10, 6, 14, 'accent', 0.35),
    rect(2, 10, 6, 14, 'accent', 0.35),
  ]),

  // Insigniteuthis albatrossi: rounded fins, broad web, and segmented cirrate arms.
  defineSpeciesIcon('I051', 'octopus', 0, [
    rect(-12, -16, 24, 4, 'body'),
    rect(-18, -12, 36, 12, 'body'),
    rect(-14, 0, 28, 6, 'body'),
    rect(-28, -12, 10, 10, 'accent'),
    rect(-32, -8, 8, 6, 'accent'),
    rect(18, -12, 10, 10, 'accent'),
    rect(24, -8, 8, 6, 'accent'),
    rect(-8, -6, 4, 4, 'purple'),
    rect(4, -6, 4, 4, 'purple'),
    rect(-26, 6, 52, 6, 'purple', 0.65),
    rect(-26, 12, 10, 6, 'purple'),
    rect(-16, 14, 10, 8, 'purple'),
    rect(6, 14, 10, 8, 'purple'),
    rect(16, 12, 10, 6, 'purple'),
  ]),

  // Graneledone antarctica: compact dark warty mantle and robust finless arms.
  defineSpeciesIcon('I052', 'octopus', 0, [
    rect(-8, -20, 16, 4, 'blackBrown'),
    rect(-14, -16, 28, 6, 'blackBrown'),
    rect(-18, -10, 36, 14, 'blackBrown'),
    rect(-14, 4, 28, 6, 'blackBrown'),
    rect(-10, -6, 6, 6, 'magenta'),
    rect(4, -6, 6, 6, 'magenta'),
    rect(-12, -12, 4, 4, 'warning'),
    rect(8, -8, 4, 4, 'warning'),
    rect(-4, 0, 4, 4, 'warning'),
    rect(10, 0, 4, 4, 'warning'),
    rect(-22, 6, 44, 5, 'blackBrown', 0.55),
    rect(-28, 10, 14, 8, 'magenta'),
    rect(-18, 18, 12, 8, 'magenta'),
    rect(-8, 20, 10, 8, 'magenta'),
    rect(2, 20, 10, 8, 'magenta'),
    rect(10, 18, 12, 8, 'magenta'),
    rect(14, 10, 14, 8, 'magenta'),
  ]),
] as const;
