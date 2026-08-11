import type Phaser from "phaser";

/** Recomputes both the FIT layout and the DOM bounds used by Phaser input. */
export function refreshGameViewport(game: Phaser.Game): void {
  game.scale.refresh();
  game.scale.updateBounds();
}

/**
 * Phaser already listens to resize/orientation events, but mobile browsers can
 * update visualViewport independently while their browser chrome expands or
 * collapses. Keep an explicit listener so pointer transforms are refreshed at
 * the same time as the CSS layout.
 */
export function installViewportListeners(game: Phaser.Game): () => void {
  const refresh = (): void => refreshGameViewport(game);
  const visualViewport = window.visualViewport;

  window.addEventListener("resize", refresh, { passive: true });
  window.addEventListener("orientationchange", refresh, { passive: true });
  visualViewport?.addEventListener("resize", refresh, { passive: true });
  visualViewport?.addEventListener("scroll", refresh, { passive: true });

  return (): void => {
    window.removeEventListener("resize", refresh);
    window.removeEventListener("orientationchange", refresh);
    visualViewport?.removeEventListener("resize", refresh);
    visualViewport?.removeEventListener("scroll", refresh);
  };
}
