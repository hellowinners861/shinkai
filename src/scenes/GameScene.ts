import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import type { InputVector } from '../input/vector';
import { VirtualJoystick } from '../input/VirtualJoystick';
import type { MobileLifecycleStatus } from '../platform/mobileLifecycle';
import { announce, prefersReducedMotion } from '../platform/preferences';

interface KeyboardSet {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

/** Playfield presentation for the Abyssal Field Console shell. */
export class GameScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Container | undefined;
  private joystick: VirtualJoystick | undefined;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private wasd: KeyboardSet | undefined;
  private paused = false;
  private lifecyclePaused = false;
  private reducedMotion = false;

  public constructor() {
    super('GameScene');
  }

  public create(): void {
    this.reducedMotion = prefersReducedMotion();
    this.paused = false;
    const lifecycleStatus = this.game.registry.get(
      'shinkai.lifecycleStatus',
    ) as MobileLifecycleStatus | undefined;
    this.lifecyclePaused = lifecycleStatus?.shouldPauseGame ?? false;
    this.game.events.on('shinkai:lifecycle', this.handleLifecycleStatus);

    document.getElementById('title-ui')?.setAttribute('hidden', '');
    document.getElementById('game-ui')?.removeAttribute('hidden');
    document.getElementById('game-container')?.removeAttribute('data-paused');
    document.getElementById('pause-overlay')?.setAttribute('hidden', '');

    const background = this.add.graphics();
    background.fillGradientStyle(
      0x0a2b36,
      0x071f2a,
      0x02070b,
      0x02070b,
      1,
    );
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add
      .rectangle(0, 108, GAME_WIDTH, 1, 0x27606a)
      .setOrigin(0)
      .setAlpha(0.5);
    this.add
      .rectangle(0, GAME_HEIGHT - 154, GAME_WIDTH, 1, 0x27606a)
      .setOrigin(0)
      .setAlpha(0.5);

    const sonarCenterX = GAME_WIDTH / 2;
    const sonarCenterY = 402;
    for (const radius of [92, 154, 216]) {
      this.add
        .circle(sonarCenterX, sonarCenterY, radius, 0x04121a)
        .setAlpha(0.08)
        .setStrokeStyle(1, 0x6bd9e8, 0.2);
    }

    this.add
      .line(
        0,
        0,
        sonarCenterX - 216,
        sonarCenterY,
        sonarCenterX + 216,
        sonarCenterY,
        0x6bd9e8,
        0.12,
      )
      .setOrigin(0);
    this.add
      .line(
        0,
        0,
        sonarCenterX,
        sonarCenterY - 216,
        sonarCenterX,
        sonarCenterY + 216,
        0x6bd9e8,
        0.12,
      )
      .setOrigin(0);

    const sweep = this.add
      .rectangle(sonarCenterX, sonarCenterY, 2, 208, 0x74f2d0)
      .setOrigin(0.5, 1)
      .setAlpha(this.reducedMotion ? 0.06 : 0.12)
      .setAngle(-35);
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: sweep,
        angle: 325,
        duration: 4000,
        ease: 'Linear',
        repeat: -1,
      });
    }

    for (let index = 0; index < 8; index += 1) {
      const y = 168 + index * 58;
      const length = index % 2 === 0 ? 16 : 9;
      this.add
        .line(0, 0, GAME_WIDTH - 28 - length, y, GAME_WIDTH - 28, y, 0x6bd9e8, 0.34)
        .setOrigin(0);
    }

    const hull = this.add
      .rectangle(0, 0, 68, 36, 0x0a2b36)
      .setStrokeStyle(2, 0x74f2d0, 0.86);
    const tail = this.add
      .rectangle(-29, 0, 12, 7, 0x27606a)
      .setStrokeStyle(1, 0x6bd9e8, 0.62);
    const fin = this.add.rectangle(-4, -21, 20, 4, 0x27606a).setAlpha(0.86);
    const observationWindow = this.add
      .circle(19, 0, 8, 0x02070b)
      .setStrokeStyle(1, 0x6bd9e8, 0.94);
    const forwardLight = this.add.circle(31, 0, 3, 0xf1b955).setAlpha(0.9);
    const player = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    player.add([hull, tail, fin, observationWindow, forwardLight]);
    this.player = player;

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as KeyboardSet;
      this.input.keyboard.on('keydown-P', this.handlePauseKey);
      this.input.keyboard.on('keydown-ESC', this.handlePauseKey);
    }

    const joystickElement = document.getElementById('virtual-joystick');
    if (joystickElement) {
      this.joystick = new VirtualJoystick(joystickElement);
    }

    this.events.once('shutdown', this.cleanup);
    this.updateHud();
    announce('潜航計器を起動しました。操舵環またはキーボードで操作します。');
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
    const pauseButton = document.getElementById('pause-button');
    const pauseGlyph = document.getElementById('pause-glyph');
    const pauseOverlay = document.getElementById('pause-overlay');
    const container = document.getElementById('game-container');

    pauseButton?.setAttribute('aria-pressed', String(this.paused));
    pauseButton?.setAttribute(
      'aria-label',
      this.paused ? '潜航を再開' : '一時停止',
    );
    pauseButton?.setAttribute('data-paused', String(this.paused));
    pauseGlyph?.replaceChildren(this.paused ? '▶' : 'II');
    pauseOverlay?.toggleAttribute('hidden', !this.paused);
    if (this.paused) {
      container?.setAttribute('data-paused', 'true');
      announce('潜航を停止しました。');
      this.scene.pause();
    } else {
      container?.removeAttribute('data-paused');
      announce('潜航を再開しました。');
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
    document.getElementById('depth-readout')?.replaceChildren('0000 m');
    document.getElementById('fuel-readout')?.replaceChildren('100%');
    document.getElementById('fuel-meter')?.setAttribute('aria-valuenow', '100');
    const fuelFill = document.getElementById('fuel-meter-fill');
    if (fuelFill instanceof HTMLElement) {
      fuelFill.style.width = '100%';
    }
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
    this.game.events.off('shinkai:lifecycle', this.handleLifecycleStatus);
    this.resetInput();
    this.joystick?.destroy();
    this.joystick = undefined;
    this.input.keyboard?.off('keydown-P', this.handlePauseKey);
    this.input.keyboard?.off('keydown-ESC', this.handlePauseKey);
    document.getElementById('game-ui')?.setAttribute('hidden', '');
    document.getElementById('title-ui')?.removeAttribute('hidden');
    document.getElementById('pause-overlay')?.setAttribute('hidden', '');
    document.getElementById('game-container')?.removeAttribute('data-paused');
    const pauseGlyph = document.getElementById('pause-glyph');
    pauseGlyph?.replaceChildren('II');
    document.getElementById('pause-button')?.setAttribute('aria-label', '一時停止');
    document.getElementById('pause-button')?.setAttribute('aria-pressed', 'false');
    document.getElementById('pause-button')?.removeAttribute('data-paused');
  };
}
