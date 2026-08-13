/** The palette is intentionally code-only; no image or external asset is used. */
export const SPECIES_PIXEL_ICON_PALETTE = {
  body: 0x74f2d0,
  accent: 0x6bd9e8,
  highlight: 0xd9f0ee,
  shadow: 0x27606a,
  dark: 0x02070b,
  warning: 0xf1b955,
  magenta: 0xe33cae,
  blackBrown: 0x281a18,
  ivory: 0xfff0c4,
  purple: 0x714594,
  silverBlue: 0xa8c4d8,
  navy: 0x13244a,
  yellow: 0xf4d35e,
  white: 0xffffff,
  pale: 0xe3d9bd,
} as const;

/** Compatibility alias for code that used the original internal name. */
export const PIXEL_COLORS = SPECIES_PIXEL_ICON_PALETTE;

export type PixelTone = keyof typeof SPECIES_PIXEL_ICON_PALETTE;
