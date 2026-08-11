import { describe, expect, it } from "vitest";

import {
  getCappedDevicePixelRatio,
  GAME_HEIGHT,
  GAME_WIDTH,
  gameConfig,
  MAX_DEVICE_PIXEL_RATIO,
  MIN_VIEWPORT_HEIGHT,
  MIN_VIEWPORT_WIDTH,
} from "../src/game/config";

describe("preparation game configuration", () => {
  it("uses the portrait logical view and expected canvas host", () => {
    expect(gameConfig.parent).toBe("game-container");
    expect(GAME_WIDTH).toBe(450);
    expect(GAME_HEIGHT).toBe(800);
    expect(GAME_WIDTH / GAME_HEIGHT).toBe(9 / 16);
    expect(gameConfig.width).toBe(GAME_WIDTH);
    expect(gameConfig.height).toBe(GAME_HEIGHT);
    expect(MIN_VIEWPORT_WIDTH).toBe(320);
    expect(MIN_VIEWPORT_HEIGHT).toBe(568);
  });

  it('keeps touch input scoped to the canvas', () => {
    expect(gameConfig.canvasStyle).toContain('display: block');
    expect(gameConfig.canvasStyle).toContain('touch-action: none');
  });

  it("enables Phaser Arcade Physics without gameplay-specific gravity", () => {
    expect(gameConfig.physics).toMatchObject({
      default: "arcade",
      arcade: {
        debug: false,
        gravity: { x: 0, y: 0 },
      },
    });
  });

  it("caps device pixel ratio at the mobile rendering budget", () => {
    expect(MAX_DEVICE_PIXEL_RATIO).toBe(2);
    expect(getCappedDevicePixelRatio(3.5)).toBe(2);
    expect(getCappedDevicePixelRatio(1.5)).toBe(1.5);
    expect(getCappedDevicePixelRatio(0.5)).toBe(1);
    expect(getCappedDevicePixelRatio(Number.NaN)).toBe(1);
  });
});
