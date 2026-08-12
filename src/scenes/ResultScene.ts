import Phaser from "phaser";

import { DIVE_MAX_FUEL } from "../game/diveProgression";
import { announce } from "../platform/preferences";
import type { DiveResultSnapshot } from "../types/game";

interface ResultSceneData {
  result?: DiveResultSnapshot;
}

/** HTML result presentation for the Abyssal Field Console shell. */
export class ResultScene extends Phaser.Scene {
  private result: DiveResultSnapshot | undefined;

  public constructor() {
    super("ResultScene");
  }

  public init(data: unknown): void {
    this.result = isResultSceneData(data) ? data.result : undefined;
  }

  public create(): void {
    const result = this.result;
    if (!result) {
      return;
    }

    document.getElementById("title-ui")?.setAttribute("hidden", "");
    document.getElementById("game-ui")?.setAttribute("hidden", "");
    document.getElementById("result-ui")?.removeAttribute("hidden");
    document.getElementById("game-container")?.removeAttribute("data-paused");

    this.renderResult(result);
    this.resetActionButtons();
    this.events.once("shutdown", this.cleanup);
    announce(this.getAnnouncement(result));
  }

  private renderResult(result: DiveResultSnapshot): void {
    const outcomeLabel = result.outcome === "cleared" ? "調査完了" : "潜航失敗";
    const outcomeElement = document.getElementById("result-outcome");
    outcomeElement?.setAttribute("data-outcome", result.outcome);
    outcomeElement?.replaceChildren(outcomeLabel);
    document.getElementById("result-depth")?.replaceChildren(
      this.formatDepth(result.reachedDepthM),
    );
    document.getElementById("result-fuel")?.replaceChildren(
      this.formatFuel(result.remainingFuel),
    );
    document.getElementById("result-elapsed")?.replaceChildren(
      this.formatElapsed(result.elapsedSeconds),
    );
    document.getElementById("result-score")?.replaceChildren(String(result.score));
    document.getElementById("result-discovered")?.replaceChildren(
      String(result.discoveredCount),
    );
    document.getElementById("result-collected")?.replaceChildren(
      String(result.collectedCount),
    );
  }

  private formatDepth(depthM: number): string {
    const depth = Number.isFinite(depthM) ? Math.max(0, Math.floor(depthM)) : 0;
    return `${depth.toLocaleString("en-US")} m`;
  }

  private formatFuel(fuel: number): string {
    const value = Number.isFinite(fuel)
      ? Phaser.Math.Clamp(fuel, 0, DIVE_MAX_FUEL)
      : 0;
    return `${value.toFixed(1)}%`;
  }

  private formatElapsed(elapsedSeconds: number): string {
    const value = Number.isFinite(elapsedSeconds)
      ? Math.max(0, elapsedSeconds)
      : 0;
    return `${value.toFixed(1)}秒`;
  }

  private getAnnouncement(result: DiveResultSnapshot): string {
    return result.outcome === "cleared"
      ? `調査完了。到達深度${this.formatDepth(result.reachedDepthM)}。`
      : `潜航失敗。到達深度${this.formatDepth(result.reachedDepthM)}。`;
  }

  private resetActionButtons(): void {
    const retryButton = document.getElementById("result-retry-button");
    const titleButton = document.getElementById("result-title-button");
    if (retryButton instanceof HTMLButtonElement) {
      retryButton.disabled = false;
    }
    if (titleButton instanceof HTMLButtonElement) {
      titleButton.disabled = false;
    }
  }

  private readonly cleanup = (): void => {
    document.getElementById("result-ui")?.setAttribute("hidden", "");
    this.resetActionButtons();
    this.result = undefined;
  };
}

function isResultSceneData(data: unknown): data is ResultSceneData {
  if (typeof data !== "object" || data === null || !("result" in data)) {
    return false;
  }

  const result = data.result;
  return typeof result === "object" && result !== null;
}
