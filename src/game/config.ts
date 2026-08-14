import type Phaser from "phaser";

export const GAME_WIDTH = 450;
export const GAME_HEIGHT = 800;

export const MIN_VIEWPORT_WIDTH = 320;
export const MIN_VIEWPORT_HEIGHT = 568;
export const MAX_DEVICE_PIXEL_RATIO = 2;

/**
 * Phaser keeps the game world at the logical size above. This helper is also
 * used by the shell when it needs a browser pixel ratio, so a high-density
 * display cannot make the mobile UI grow without bound.
 */
export function getCappedDevicePixelRatio(pixelRatio?: number): number {
  const source = pixelRatio ??
    (typeof window !== "undefined" ? window.devicePixelRatio : 1);

  if (!Number.isFinite(source) || source <= 0) {
    return 1;
  }

  return Math.min(Math.max(source, 1), MAX_DEVICE_PIXEL_RATIO);
}

/**
 * Shared, renderer-independent game settings for the preparation shell.
 * Runtime-only Phaser constants and the active scene list are composed in main.ts.
 */
export const gameConfig = {
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#0a2230",
  canvasStyle: "display: block; touch-action: none;",
  disableContextMenu: true,
  input: {
    activePointers: 2,
    windowEvents: true,
    keyboard: true,
    mouse: true,
    touch: {
      capture: true,
    },
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 },
    },
  },
} satisfies Omit<Phaser.Types.Core.GameConfig, "type" | "scene" | "scale">;
