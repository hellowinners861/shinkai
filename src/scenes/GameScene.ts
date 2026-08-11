import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../game/config";
import { VirtualJoystick } from "../input/VirtualJoystick";
import type { MobileLifecycleStatus } from "../platform/mobileLifecycle";
import { announce, prefersReducedMotion } from "../platform/preferences";
import type { InputVector } from "../input/vector";

interface KeyboardSet {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

/** Development-only mobile vertical slice shell. No catalog or release assets are loaded. */
export class GameScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Rectangle | undefined;
  private joystick: VirtualJoystick | undefined;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private wasd: KeyboardSet | undefined;
  private paused = false;
  private lifecyclePaused = false;
  private reducedMotion = false;

  public constructor() {
    super("GameScene");
  }

  public create(): void {
    this.reducedMotion = prefersReducedMotion();
    this.paused = false;
    const lifecycleStatus = this.game.registry.get(
      "shinkai.lifecycleStatus",
    ) as MobileLifecycleStatus | undefined;
    this.lifecyclePaused = lifecycleStatus?.shouldPauseGame ?? false;
    this.game.events.on("shinkai:lifecycle", this.handleLifecycleStatus);

    document.getElementById("title-ui")?.setAttribute("hidden", "");
    document.getElementById("game-ui")?.removeAttribute("hidden");
    document.getElementById("game-container")?.removeAttribute("data-paused");

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x061522).setOrigin(0);
    this.add.rectangle(0, 0, GAME_WIDTH, 116, 0x0b3045).setOrigin(0);
    this.add.rectangle(0, GAME_HEIGHT - 180, GAME_WIDTH, 180, 0x082235).setOrigin(0);
    this.add.line(0, 0, 0, 0, GAME_WIDTH, 0, 0x236078, 0.5).setOrigin(0);
    this.add.line(0, 0, 0, 116, GAME_WIDTH, 116, 0x236078, 0.5).setOrigin(0);

    const marker = this.add.circle(GAME_WIDTH / 2, 246, 5, 0x82d8f5).setAlpha(0.3);
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: marker,
        alpha: { from: 0.2, to: 0.65 },
        duration: 1400,
        yoyo: true,
        repeat: -1,
      });
    }

    this.add
      .text(24, 28, "MOBILE SHELL", {
        color: "#e9faff",
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setOrigin(0);
    this.add
      .text(24, 62, "Fixed portrait game view", {
        color: "#9fc7d6",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
      })
      .setOrigin(0);

    this.player = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 68, 36, 0x2696bd);
    this.player.setStrokeStyle(2, 0xe9faff);
    this.add.circle(GAME_WIDTH / 2 + 20, GAME_HEIGHT / 2, 8, 0x071929);
    this.add.rectangle(GAME_WIDTH / 2 - 56, GAME_HEIGHT / 2, 20, 6, 0x82d8f5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 144, "WASD / arrow keys are the PC fallback", {
        color: "#b9dbe8",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        align: "center",
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 112, "The submarine stays inside the fixed view.", {
        color: "#789cad",
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        align: "center",
      })
      .setOrigin(0.5);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as KeyboardSet;
      this.input.keyboard.on("keydown-P", this.handlePauseKey);
      this.input.keyboard.on("keydown-ESC", this.handlePauseKey);
    }

    const joystickElement = document.getElementById("virtual-joystick");
    if (joystickElement) {
      this.joystick = new VirtualJoystick(joystickElement);
    }

    this.events.once("shutdown", this.cleanup);
    this.updateHud();
    announce("Dive shell ready. Move with the touch stick or keyboard.");
  }

  public update(_time: number, delta: number): void {
    if (!this.player || this.paused || this.lifecyclePaused) {
      return;
    }

    const joystickVector = this.joystick?.getVector();
    const input = joystickVector && joystickVector.magnitude > 0
      ? joystickVector
      : this.readKeyboardVector();
    const speed = 180;
    const seconds = Math.min(delta, 50) / 1000;

    this.player.x = Phaser.Math.Clamp(
      this.player.x + input.x * speed * seconds,
      34,
      GAME_WIDTH - 34,
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y + input.y * speed * seconds,
      134,
      GAME_HEIGHT - 198,
    );
  }

  public togglePaused(): void {
    this.paused = !this.paused;
    const pauseButton = document.getElementById("pause-button");
    const container = document.getElementById("game-container");

    pauseButton?.setAttribute("aria-pressed", String(this.paused));
    if (pauseButton) {
      pauseButton.textContent = this.paused ? "Resume" : "Pause";
    }
    if (this.paused) {
      container?.setAttribute("data-paused", "true");
      announce("Game paused.");
      this.scene.pause();
    } else {
      container?.removeAttribute("data-paused");
      announce("Game resumed.");
      this.scene.resume();
    }
  }

  private readKeyboardVector(): InputVector {
    let x = 0;
    let y = 0;

    if (this.cursors?.left.isDown || this.wasd?.left.isDown) {
      x -= 1;
    }
    if (this.cursors?.right.isDown || this.wasd?.right.isDown) {
      x += 1;
    }
    if (this.cursors?.up.isDown || this.wasd?.up.isDown) {
      y -= 1;
    }
    if (this.cursors?.down.isDown || this.wasd?.down.isDown) {
      y += 1;
    }

    const magnitude = Math.hypot(x, y);
    if (magnitude === 0) {
      return { x: 0, y: 0, magnitude: 0 };
    }

    const scale = Math.min(1, 1 / magnitude);
    return { x: x * scale, y: y * scale, magnitude: Math.min(1, magnitude) };
  }

  private updateHud(): void {
    document.getElementById("depth-readout")?.replaceChildren("Depth 0m");
    document.getElementById("fuel-readout")?.replaceChildren("Fuel 100");
  }

  private readonly handlePauseKey = (): void => {
    this.togglePaused();
  };

  private readonly handleLifecycleStatus = (status: MobileLifecycleStatus): void => {
    this.lifecyclePaused = status.shouldPauseGame;
    if (this.lifecyclePaused) {
      this.resetInput();
    }
  };

  private resetInput(): void {
    this.joystick?.reset();
    this.input.keyboard?.resetKeys();
  }

  private readonly cleanup = (): void => {
    this.game.events.off("shinkai:lifecycle", this.handleLifecycleStatus);
    this.resetInput();
    this.joystick?.destroy();
    this.joystick = undefined;
    this.input.keyboard?.off("keydown-P", this.handlePauseKey);
    this.input.keyboard?.off("keydown-ESC", this.handlePauseKey);
    document.getElementById("game-ui")?.setAttribute("hidden", "");
    document.getElementById("title-ui")?.removeAttribute("hidden");
    document.getElementById("pause-button")?.replaceChildren("Pause");
    document.getElementById("pause-button")?.setAttribute("aria-pressed", "false");
  };
}
