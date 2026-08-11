import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import { announce, prefersReducedMotion } from '../platform/preferences';

/** Title presentation for the Abyssal Field Console shell. */
export class TitleScene extends Phaser.Scene {
  public constructor() {
    super('TitleScene');
  }

  public create(): void {
    const reducedMotion = prefersReducedMotion();
    const centerX = GAME_WIDTH / 2;
    const windowCenterY = 330;
    const windowRadius = 116;

    document.getElementById('title-ui')?.removeAttribute('hidden');
    document.getElementById('game-ui')?.setAttribute('hidden', '');
    document.getElementById('game-container')?.removeAttribute('data-paused');

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
      .rectangle(0, 106, GAME_WIDTH, 1, 0x27606a)
      .setOrigin(0)
      .setAlpha(0.5);
    this.add
      .rectangle(0, GAME_HEIGHT - 166, GAME_WIDTH, 1, 0x27606a)
      .setOrigin(0)
      .setAlpha(0.56);

    this.add
      .circle(centerX, windowCenterY, windowRadius, 0x04121a)
      .setAlpha(0.72)
      .setStrokeStyle(1, 0x6bd9e8, 0.46);
    this.add
      .circle(centerX, windowCenterY, 94, 0x04121a)
      .setAlpha(0.2)
      .setStrokeStyle(1, 0x74f2d0, 0.28);
    this.add
      .circle(centerX, windowCenterY, 70, 0x04121a)
      .setAlpha(0.18)
      .setStrokeStyle(1, 0x6bd9e8, 0.22);

    this.add
      .line(
        0,
        0,
        centerX - windowRadius,
        windowCenterY,
        centerX + windowRadius,
        windowCenterY,
        0x6bd9e8,
        0.2,
      )
      .setOrigin(0);
    this.add
      .line(
        0,
        0,
        centerX,
        windowCenterY - windowRadius,
        centerX,
        windowCenterY + windowRadius,
        0x6bd9e8,
        0.2,
      )
      .setOrigin(0);

    for (const angle of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
      const outerX = centerX + Math.cos(angle) * windowRadius;
      const outerY = windowCenterY + Math.sin(angle) * windowRadius;
      const innerX = centerX + Math.cos(angle) * (windowRadius - 10);
      const innerY = windowCenterY + Math.sin(angle) * (windowRadius - 10);
      this.add
        .line(0, 0, innerX, innerY, outerX, outerY, 0x74f2d0, 0.54)
        .setOrigin(0);
    }

    const sweep = this.add
      .rectangle(centerX, windowCenterY, 2, windowRadius - 8, 0x74f2d0)
      .setOrigin(0.5, 1)
      .setAlpha(reducedMotion ? 0.08 : 0.16)
      .setAngle(-38);
    if (!reducedMotion) {
      this.tweens.add({
        targets: sweep,
        angle: 322,
        duration: 4200,
        ease: 'Linear',
        repeat: -1,
      });
    }

    this.add
      .rectangle(centerX, windowCenterY + 2, 92, 30, 0x0a2b36)
      .setStrokeStyle(2, 0x74f2d0, 0.78);
    this.add
      .rectangle(centerX - 55, windowCenterY + 2, 18, 5, 0x74f2d0)
      .setAlpha(0.78);
    this.add
      .rectangle(centerX + 43, windowCenterY + 2, 10, 20, 0x27606a)
      .setAlpha(0.9);
    this.add
      .rectangle(centerX - 9, windowCenterY - 20, 22, 4, 0x27606a)
      .setAlpha(0.9);
    this.add
      .circle(centerX + 20, windowCenterY, 8, 0x02070b)
      .setStrokeStyle(1, 0x6bd9e8, 0.9);
    this.add.circle(centerX + 37, windowCenterY + 2, 3, 0xf1b955).setAlpha(0.8);

    for (const y of [142, 154, 506, 518]) {
      this.add
        .line(0, 0, 42, y, 96, y, 0x27606a, 0.32)
        .setOrigin(0);
      this.add
        .line(0, 0, GAME_WIDTH - 96, y, GAME_WIDTH - 42, y, 0x27606a, 0.32)
        .setOrigin(0);
    }

    this.input.keyboard?.on('keydown-ENTER', this.requestStart);
    this.input.keyboard?.on('keydown-SPACE', this.requestStart);
    this.events.once('shutdown', this.cleanup);
    announce('タイトル画面です。潜航を開始できます。');
  }

  private readonly requestStart = (): void => {
    this.game.events.emit('shinkai:start-request');
  };

  private readonly cleanup = (): void => {
    this.input.keyboard?.off('keydown-ENTER', this.requestStart);
    this.input.keyboard?.off('keydown-SPACE', this.requestStart);
  };
}
