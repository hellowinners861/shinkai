import Phaser from 'phaser';

import {
  getCappedDevicePixelRatio,
  MIN_VIEWPORT_HEIGHT,
  MIN_VIEWPORT_WIDTH,
  gameConfig,
} from './game/config';
import {
  createMobileLifecycleState,
  getMobileLifecycleStatus,
  reduceMobileLifecycleState,
  type MobileLifecycleEvent,
} from './platform/mobileLifecycle';
import { announce, readAudioMuted, writeAudioMuted } from './platform/preferences';
import { installViewportListeners } from './platform/viewport';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { TitleScene } from './scenes/TitleScene';
import './style.css';

const game = new Phaser.Game({
  ...gameConfig,
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: MIN_VIEWPORT_WIDTH,
      height: MIN_VIEWPORT_HEIGHT,
    },
    autoRound: true,
  },
  scene: [BootScene, TitleScene, GameScene, ResultScene],
});

const cappedDevicePixelRatio = getCappedDevicePixelRatio();
document.documentElement.style.setProperty(
  '--shinkai-device-pixel-ratio',
  String(cappedDevicePixelRatio),
);
game.canvas.style.touchAction = 'none';
game.canvas.dataset.pixelRatio = String(cappedDevicePixelRatio);

const orientationWarning = document.getElementById('orientation-warning');
const continueLandscapeButton = document.getElementById('continue-landscape');
const resumeWarning = document.getElementById('resume-warning');
const resumeButton = document.getElementById('resume-button');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const audioButton = document.getElementById('audio-button');
const resultRetryButton = document.getElementById('result-retry-button');
const resultTitleButton = document.getElementById('result-title-button');

let audioMuted = readAudioMuted();

function getViewportSize(): { width: number; height: number } {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

const initialViewport = getViewportSize();
let lifecycleState = createMobileLifecycleState({
  visibility: document.visibilityState === 'hidden' ? 'hidden' : 'visible',
  viewportWidth: initialViewport.width,
  viewportHeight: initialViewport.height,
});

function setHidden(element: HTMLElement | null, hidden: boolean): void {
  element?.toggleAttribute('hidden', hidden);
}

function syncAudioButton(): void {
  if (!audioButton) {
    return;
  }

  const state = document.getElementById('audio-state');
  audioButton.setAttribute('aria-pressed', String(audioMuted));
  audioButton.setAttribute(
    'aria-label',
    audioMuted ? '音声を入れる' : '音声を切る',
  );
  audioButton.dataset.muted = String(audioMuted);
  state?.replaceChildren(audioMuted ? 'OFF' : 'ON');
}

function applyLifecycleState(): void {
  const status = getMobileLifecycleStatus(lifecycleState);
  document.documentElement.dataset.orientation = status.isLandscape
    ? 'landscape'
    : 'portrait';
  setHidden(orientationWarning, !status.showLandscapeGuidance);
  setHidden(
    resumeWarning,
    !lifecycleState.resumeRequired ||
      lifecycleState.visibility === 'hidden' ||
      status.showLandscapeGuidance,
  );

  game.registry.set('shinkai.lifecycleStatus', status);
  game.events.emit('shinkai:lifecycle', status);

  if (status.showLandscapeGuidance) {
    game.loop.sleep();
    announce('縦画面を推奨しています。端末を回転するか、横向きのまま続けてください。');
    return;
  }

  if (status.shouldPauseGame) {
    game.loop.sleep();
    return;
  }

  game.loop.wake();
}

function dispatchLifecycleEvent(event: MobileLifecycleEvent): void {
  lifecycleState = reduceMobileLifecycleState(lifecycleState, event);
  applyLifecycleState();
}

function syncOrientation(): void {
  const viewport = getViewportSize();
  dispatchLifecycleEvent({
    type: 'orientationchange',
    width: viewport.width,
    height: viewport.height,
  });
}

function startGame(): boolean {
  const status = getMobileLifecycleStatus(lifecycleState);
  if (!status.canRunGame) {
    applyLifecycleState();
    return false;
  }

  setHidden(resumeWarning, true);
  game.loop.wake();
  game.scene.start('GameScene');
  announce('潜航を開始しました。操舵環またはキーボードで調査艇を操作します。');
  return true;
}

function returnToTitle(): void {
  if (game.scene.isActive('TitleScene')) {
    return;
  }

  game.scene.start('TitleScene');
  applyLifecycleState();
  announce('タイトルへ戻りました。');
}

continueLandscapeButton?.addEventListener('click', () => {
  dispatchLifecycleEvent({ type: 'continue-landscape' });
  announce('横向きで続けます。縦比率の観測視野は維持されます。');
});

resumeButton?.addEventListener('click', () => {
  dispatchLifecycleEvent({ type: 'resume' });
  if (getMobileLifecycleStatus(lifecycleState).canRunGame) {
    announce('潜航を再開しました。');
  }
});

startButton?.addEventListener('click', startGame);
game.events.on('shinkai:start-request', startGame);
resultRetryButton?.addEventListener('click', () => {
  if (!startGame()) {
    return;
  }

  resultRetryButton.setAttribute('disabled', '');
  resultTitleButton?.setAttribute('disabled', '');
});
resultTitleButton?.addEventListener('click', () => {
  if (game.scene.isActive('TitleScene')) {
    return;
  }

  resultRetryButton?.setAttribute('disabled', '');
  resultTitleButton.setAttribute('disabled', '');
  returnToTitle();
});
game.events.on('shinkai:boot-ready', applyLifecycleState);

pauseButton?.addEventListener('click', () => {
  const scene = game.scene.getScene('GameScene');
  if (scene instanceof GameScene) {
    scene.togglePaused();
  }
});

audioButton?.addEventListener('click', () => {
  audioMuted = !audioMuted;
  writeAudioMuted(audioMuted);
  syncAudioButton();
  announce(audioMuted ? '音声を切りました。' : '音声を入れました。');
});

document.addEventListener('visibilitychange', () => {
  const visibility = document.visibilityState === 'hidden' ? 'hidden' : 'visible';
  dispatchLifecycleEvent({ type: 'visibilitychange', visibility });
  if (visibility === 'hidden') {
    announce('ページが非表示になったため、潜航と操舵を停止しました。');
    return;
  }

  announce('安全のため、潜航に戻るボタンで再開してください。');
});

window.addEventListener(
  'blur',
  () => {
    dispatchLifecycleEvent({ type: 'blur' });
    announce('フォーカスを失ったため、潜航と操舵を停止しました。');
  },
  { passive: true },
);

window.addEventListener(
  'focus',
  () => {
    dispatchLifecycleEvent({ type: 'focus' });
  },
  { passive: true },
);

window.addEventListener('resize', syncOrientation, { passive: true });
window.addEventListener('orientationchange', syncOrientation, { passive: true });
window.visualViewport?.addEventListener('resize', syncOrientation, { passive: true });

syncAudioButton();
installViewportListeners(game);
window.setTimeout(syncOrientation, 0);

export { game };
