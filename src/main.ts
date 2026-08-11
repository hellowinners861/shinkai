import Phaser from "phaser";

import {
  getCappedDevicePixelRatio,
  MIN_VIEWPORT_HEIGHT,
  MIN_VIEWPORT_WIDTH,
  gameConfig,
} from "./game/config";
import {
  createMobileLifecycleState,
  getMobileLifecycleStatus,
  reduceMobileLifecycleState,
  type MobileLifecycleEvent,
} from "./platform/mobileLifecycle";
import { announce, readAudioMuted, writeAudioMuted } from "./platform/preferences";
import { installViewportListeners } from "./platform/viewport";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { ResultScene } from "./scenes/ResultScene";
import { TitleScene } from "./scenes/TitleScene";
import "./style.css";

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
  "--shinkai-device-pixel-ratio",
  String(cappedDevicePixelRatio),
);
game.canvas.style.touchAction = "none";
game.canvas.dataset.pixelRatio = String(cappedDevicePixelRatio);

const orientationWarning = document.getElementById("orientation-warning");
const continueLandscapeButton = document.getElementById("continue-landscape");
const resumeWarning = document.getElementById("resume-warning");
const resumeButton = document.getElementById("resume-button");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const audioButton = document.getElementById("audio-button");

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
  visibility: document.visibilityState === "hidden" ? "hidden" : "visible",
  viewportWidth: initialViewport.width,
  viewportHeight: initialViewport.height,
});

function setHidden(element: HTMLElement | null, hidden: boolean): void {
  element?.toggleAttribute("hidden", hidden);
}

function syncAudioButton(): void {
  if (!audioButton) {
    return;
  }

  audioButton.textContent = audioMuted ? "Audio: off" : "Audio: on";
  audioButton.setAttribute("aria-pressed", String(audioMuted));
}

function applyLifecycleState(): void {
  const status = getMobileLifecycleStatus(lifecycleState);
  document.documentElement.dataset.orientation = status.isLandscape
    ? "landscape"
    : "portrait";
  setHidden(orientationWarning, !status.showLandscapeGuidance);
  setHidden(
    resumeWarning,
    !lifecycleState.resumeRequired ||
      lifecycleState.visibility === "hidden" ||
      status.showLandscapeGuidance,
  );

  game.registry.set("shinkai.lifecycleStatus", status);
  game.events.emit("shinkai:lifecycle", status);

  if (status.showLandscapeGuidance) {
    game.loop.sleep();
    announce("Portrait orientation is recommended. Rotate the device or continue in landscape.");
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
    type: "orientationchange",
    width: viewport.width,
    height: viewport.height,
  });
}

function startGame(): void {
  const status = getMobileLifecycleStatus(lifecycleState);
  if (!status.canRunGame) {
    applyLifecycleState();
    return;
  }

  setHidden(resumeWarning, true);
  game.loop.wake();
  game.scene.start("GameScene");
  announce("Dive started. Use the movement stick or WASD and arrow keys.");
}

continueLandscapeButton?.addEventListener("click", () => {
  dispatchLifecycleEvent({ type: "continue-landscape" });
  announce("Continuing in landscape. The portrait game view remains fixed.");
});

resumeButton?.addEventListener("click", () => {
  dispatchLifecycleEvent({ type: "resume" });
  if (getMobileLifecycleStatus(lifecycleState).canRunGame) {
    announce("Game resumed.");
  }
});

startButton?.addEventListener("click", startGame);
game.events.on("shinkai:start-request", startGame);
game.events.on("shinkai:boot-ready", applyLifecycleState);

pauseButton?.addEventListener("click", () => {
  const scene = game.scene.getScene("GameScene");
  if (scene instanceof GameScene) {
    scene.togglePaused();
  }
});

audioButton?.addEventListener("click", () => {
  audioMuted = !audioMuted;
  writeAudioMuted(audioMuted);
  syncAudioButton();
  announce(audioMuted ? "Audio muted." : "Audio enabled.");
});

document.addEventListener("visibilitychange", () => {
  const visibility = document.visibilityState === "hidden" ? "hidden" : "visible";
  dispatchLifecycleEvent({ type: "visibilitychange", visibility });
  if (visibility === "hidden") {
    announce("Game and input stopped while the page is hidden.");
    return;
  }

  announce("Press Return to game to resume safely.");
});

window.addEventListener("blur", () => {
  dispatchLifecycleEvent({ type: "blur" });
  announce("Game and input stopped after focus was lost.");
}, { passive: true });

window.addEventListener("focus", () => {
  dispatchLifecycleEvent({ type: "focus" });
}, { passive: true });

window.addEventListener("resize", syncOrientation, { passive: true });
window.addEventListener("orientationchange", syncOrientation, { passive: true });
window.visualViewport?.addEventListener("resize", syncOrientation, { passive: true });

syncAudioButton();
installViewportListeners(game);
window.setTimeout(syncOrientation, 0);

export { game };
