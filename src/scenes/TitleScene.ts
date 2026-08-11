import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../game/config";
import { announce, prefersReducedMotion } from "../platform/preferences";

/** Visible launch target for the mobile-first preparation shell. */
export class TitleScene extends Phaser.Scene {
  public constructor() {
    super("TitleScene");
  }

  public create(): void {
    const reducedMotion = prefersReducedMotion();

    document.getElementById("title-ui")?.removeAttribute("hidden");
    document.getElementById("game-ui")?.setAttribute("hidden", "");

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x071929).setOrigin(0);
    this.add.rectangle(0, 0, GAME_WIDTH, 180, 0x0b3045).setOrigin(0);
    this.add.circle(70, 236, 5, 0x82d8f5).setAlpha(0.45);
    this.add.circle(382, 315, 7, 0x2696bd).setAlpha(0.4);
    this.add.circle(318, 590, 4, 0x82d8f5).setAlpha(0.35);

    this.add
      .text(GAME_WIDTH / 2, 190, "SHINKAI", {
        color: "#e9faff",
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 252, "MOBILE VERTICAL SHELL", {
        color: "#82d8f5",
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    this.add
      .rectangle(GAME_WIDTH / 2, 415, 172, 76, 0x0e4964)
      .setStrokeStyle(2, 0x82d8f5);
    this.add.rectangle(GAME_WIDTH / 2 - 22, 415, 94, 44, 0x2696bd);
    this.add.circle(GAME_WIDTH / 2 + 48, 415, 14, 0x071929).setStrokeStyle(2, 0xe9faff);

    this.add
      .text(GAME_WIDTH / 2, 520, "Portrait 9:16  |  450 x 800 logical view", {
        color: "#d7f4ff",
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        556,
        reducedMotion ? "Reduced motion is enabled." : "Touch controls and keyboard fallback are ready.",
        {
          color: "#9fc7d6",
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          align: "center",
        },
      )
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown-ENTER", this.requestStart);
    this.input.keyboard?.on("keydown-SPACE", this.requestStart);
    this.events.once("shutdown", this.cleanup);
    announce("Title ready. Press Start dive or Enter to begin.");
  }

  private readonly requestStart = (): void => {
    this.game.events.emit("shinkai:start-request");
  };

  private readonly cleanup = (): void => {
    this.input.keyboard?.off("keydown-ENTER", this.requestStart);
    this.input.keyboard?.off("keydown-SPACE", this.requestStart);
  };
}
