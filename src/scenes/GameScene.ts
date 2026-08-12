import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import {
  advanceDiveProgression,
  clampDiveFrameSeconds,
  createInitialDiveProgressionState,
  DIVE_AUTO_DESCENT_SPEED_M_PER_SECOND,
  DIVE_MAX_FUEL,
  DIVE_TARGET_DEPTH_M,
  type DiveProgressionState,
} from '../game/diveProgression';
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

interface MarineSnowParticle {
  sprite: Phaser.GameObjects.Arc;
  speedPxPerSecond: number;
}

interface HudSnapshot {
  depthText: string;
  fuelText: string;
  fuelMeterValue: string;
  statusPrimary: string;
  statusSecondary: string;
}

const MARINE_SNOW_TOP = 112;
const MARINE_SNOW_BOTTOM = GAME_HEIGHT - 158;
const MARINE_SNOW_LAYOUT = [
  { x: 24, y: 148, radius: 2, speed: 12, alpha: 0.1, color: 0x6bd9e8 },
  { x: 77, y: 237, radius: 1, speed: 12, alpha: 0.12, color: 0x6bd9e8 },
  { x: 129, y: 366, radius: 2, speed: 12, alpha: 0.08, color: 0x6bd9e8 },
  { x: 188, y: 176, radius: 1, speed: 12, alpha: 0.14, color: 0x6bd9e8 },
  { x: 231, y: 542, radius: 2, speed: 12, alpha: 0.1, color: 0x6bd9e8 },
  { x: 276, y: 294, radius: 1, speed: 12, alpha: 0.16, color: 0x6bd9e8 },
  { x: 323, y: 456, radius: 2, speed: 12, alpha: 0.1, color: 0x6bd9e8 },
  { x: 369, y: 204, radius: 1, speed: 12, alpha: 0.12, color: 0x6bd9e8 },
  { x: 414, y: 598, radius: 2, speed: 12, alpha: 0.08, color: 0x6bd9e8 },
  { x: 438, y: 328, radius: 1, speed: 12, alpha: 0.14, color: 0x6bd9e8 },
  { x: 46, y: 421, radius: 2, speed: 34, alpha: 0.16, color: 0x74f2d0 },
  { x: 101, y: 154, radius: 1, speed: 34, alpha: 0.2, color: 0x74f2d0 },
  { x: 148, y: 509, radius: 2, speed: 34, alpha: 0.14, color: 0x74f2d0 },
  { x: 202, y: 269, radius: 1, speed: 34, alpha: 0.22, color: 0x74f2d0 },
  { x: 254, y: 624, radius: 2, speed: 34, alpha: 0.18, color: 0x74f2d0 },
  { x: 302, y: 392, radius: 1, speed: 34, alpha: 0.12, color: 0x74f2d0 },
  { x: 348, y: 181, radius: 2, speed: 34, alpha: 0.2, color: 0x74f2d0 },
  { x: 391, y: 475, radius: 1, speed: 34, alpha: 0.16, color: 0x74f2d0 },
  { x: 421, y: 252, radius: 2, speed: 34, alpha: 0.14, color: 0x74f2d0 },
  { x: 12, y: 570, radius: 1, speed: 34, alpha: 0.22, color: 0x74f2d0 },
] as const;

/** Playfield presentation for the Abyssal Field Console shell. */
export class GameScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Container | undefined;
  private joystick: VirtualJoystick | undefined;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private wasd: KeyboardSet | undefined;
  private paused = false;
  private lifecyclePaused = false;
  private reducedMotion = false;
  private diveProgression: DiveProgressionState =
    createInitialDiveProgressionState();
  private marineSnow: MarineSnowParticle[] = [];
  private hudSnapshot: HudSnapshot | undefined;

  public constructor() {
    super('GameScene');
  }

  public create(): void {
    this.reducedMotion = prefersReducedMotion();
    this.paused = false;
    this.diveProgression = createInitialDiveProgressionState();
    this.marineSnow = [];
    this.hudSnapshot = undefined;
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
    this.createMarineSnow();
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
    if (
      !this.player ||
      this.paused ||
      this.lifecyclePaused ||
      this.diveProgression.status !== 'descending'
    ) {
      return;
    }

    const frameSeconds = clampDiveFrameSeconds(delta / 1000);
    const previousStatus = this.diveProgression.status;
    const nextProgression = advanceDiveProgression(
      this.diveProgression,
      frameSeconds,
    );
    const progressionChanged = nextProgression !== this.diveProgression;
    this.diveProgression = nextProgression;

    if (progressionChanged) {
      this.updateHud();
    }

    if (previousStatus !== nextProgression.status) {
      this.announceTerminalStatus(nextProgression.status);
    }

    if (nextProgression.status !== 'descending') {
      return;
    }

    if (!this.reducedMotion) {
      this.updateMarineSnow(frameSeconds);
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
    const depth = Number.isFinite(this.diveProgression.depthM)
      ? Math.max(0, Math.floor(this.diveProgression.depthM))
      : 0;
    const fuel = Number.isFinite(this.diveProgression.fuel)
      ? Phaser.Math.Clamp(this.diveProgression.fuel, 0, DIVE_MAX_FUEL)
      : 0;
    const statusText = this.getStatusText();
    const snapshot: HudSnapshot = {
      depthText: `${String(depth).padStart(4, '0')} m`,
      fuelText: `${fuel.toFixed(1)}%`,
      fuelMeterValue: String(fuel),
      statusPrimary: statusText.primary,
      statusSecondary: statusText.secondary,
    };

    if (!this.hudSnapshot || this.hudSnapshot.depthText !== snapshot.depthText) {
      document.getElementById('depth-readout')?.replaceChildren(snapshot.depthText);
    }
    if (!this.hudSnapshot || this.hudSnapshot.fuelText !== snapshot.fuelText) {
      document.getElementById('fuel-readout')?.replaceChildren(snapshot.fuelText);
    }
    if (
      !this.hudSnapshot ||
      this.hudSnapshot.fuelMeterValue !== snapshot.fuelMeterValue
    ) {
      document
        .getElementById('fuel-meter')
        ?.setAttribute('aria-valuenow', snapshot.fuelMeterValue);
      const fuelFill = document.getElementById('fuel-meter-fill');
      if (fuelFill instanceof HTMLElement) {
        fuelFill.style.width = `${snapshot.fuelMeterValue}%`;
      }
    }

    if (
      !this.hudSnapshot ||
      this.hudSnapshot.statusPrimary !== snapshot.statusPrimary ||
      this.hudSnapshot.statusSecondary !== snapshot.statusSecondary
    ) {
      const statusElement = document.getElementById('dive-status');
      statusElement?.children.item(0)?.replaceChildren(snapshot.statusPrimary);
      statusElement?.children.item(1)?.replaceChildren(snapshot.statusSecondary);
    }

    this.hudSnapshot = snapshot;
  }

  private getStatusText(): { primary: string; secondary: string } {
    switch (this.diveProgression.status) {
      case 'cleared':
        return { primary: 'TARGET REACHED', secondary: '' };
      case 'depleted':
        return { primary: 'FUEL EMPTY', secondary: '' };
      case 'descending':
        return {
          primary: 'DESCENDING',
          secondary: `AUTO / ${DIVE_AUTO_DESCENT_SPEED_M_PER_SECOND} M/S`,
        };
    }
  }

  private announceTerminalStatus(status: DiveProgressionState['status']): void {
    if (status === 'cleared') {
      announce(`目標深度${DIVE_TARGET_DEPTH_M.toLocaleString('en-US')}mに到達しました。`);
    } else if (status === 'depleted') {
      announce('燃料が空になったため、潜航を停止しました。');
    }
  }

  private createMarineSnow(): void {
    for (const particle of MARINE_SNOW_LAYOUT) {
      this.marineSnow.push({
        sprite: this.add.circle(
          particle.x,
          particle.y,
          particle.radius,
          particle.color,
        ).setAlpha(particle.alpha),
        speedPxPerSecond: particle.speed,
      });
    }
  }

  private updateMarineSnow(seconds: number): void {
    if (seconds <= 0) {
      return;
    }

    const wrapHeight = MARINE_SNOW_BOTTOM - MARINE_SNOW_TOP;
    for (const particle of this.marineSnow) {
      particle.sprite.y -= particle.speedPxPerSecond * seconds;
      while (particle.sprite.y < MARINE_SNOW_TOP) {
        particle.sprite.y += wrapHeight;
      }
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
