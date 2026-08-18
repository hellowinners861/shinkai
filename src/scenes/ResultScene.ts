import Phaser from "phaser";

import { DIVE_MAX_FUEL } from "../game/diveProgression";
import {
  SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT,
  drawSpeciesPixelIconToCanvasContext,
  getSpeciesPixelIconDefinitionForSpecies,
} from "../game/speciesPixelIcons";
import { announce } from "../platform/preferences";
import type { DiveResultSnapshot } from "../types/game";

type DiveResultNewDiscovery = DiveResultSnapshot["newDiscoveries"][number];

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

    const newBestElement = document.getElementById("result-new-best");
    if (newBestElement) {
      newBestElement.toggleAttribute("hidden", !result.isNewBest);
      newBestElement.replaceChildren(result.isNewBest ? "NEW BEST" : "");
    }

    this.setResultText("result-score", String(result.score));
    this.setResultText("result-best-score", String(result.bestScore));
    this.setResultText("result-dive-count", String(result.diveCount));
    this.setResultText("result-clear-count", String(result.clearCount));
    this.setResultText("result-depth", this.formatDepth(result.reachedDepthM));
    this.setResultText("result-fuel", this.formatFuel(result.remainingFuel));
    this.setResultText("result-elapsed", this.formatElapsed(result.elapsedSeconds));
    this.setResultText("result-collected", String(result.collectedCount));
    this.setResultText("result-discovered", String(result.discoveredCount));

    this.setResultText(
      "result-scan-score",
      String(result.scoreBreakdown.scanScore),
    );
    this.setResultText(
      "result-new-species-score",
      String(result.scoreBreakdown.firstDiscoveryBonus),
    );
    this.setResultText(
      "result-depth-score",
      String(result.scoreBreakdown.depthBonus),
    );
    this.setResultText(
      "result-fuel-score",
      String(result.scoreBreakdown.fuelBonus),
    );

    this.renderNewDiscoveries(result.newDiscoveries);
  }

  private setResultText(id: string, value: string): void {
    document.getElementById(id)?.replaceChildren(value);
  }

  private renderNewDiscoveries(
    discoveries: readonly DiveResultNewDiscovery[],
  ): void {
    const list = document.getElementById("result-discovery-list");
    const empty = document.getElementById("result-discovery-empty");
    const safeDiscoveries = Array.isArray(discoveries) ? discoveries : [];

    list?.replaceChildren();
    empty?.replaceChildren("今回の新発見はありません");
    empty?.toggleAttribute("hidden", safeDiscoveries.length > 0);

    if (!list || safeDiscoveries.length === 0) {
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const discovery of safeDiscoveries) {
      fragment.appendChild(this.createDiscoveryItem(discovery));
    }
    list.appendChild(fragment);
  }

  private createDiscoveryItem(
    discovery: DiveResultNewDiscovery,
  ): HTMLLIElement {
    const item = document.createElement("li");
    item.className = "result-discovery-item";

    item.append(
      this.createDiscoveryIcon(discovery),
      this.createDiscoveryCopy(discovery),
    );
    return item;
  }

  private createDiscoveryIcon(
    discovery: DiveResultNewDiscovery,
  ): HTMLElement {
    const definition = getSpeciesPixelIconDefinitionForSpecies({
      sourceCatalogId: discovery.sourceCatalogId,
      category: discovery.category,
    });
    if (!definition) {
      return this.createDiscoveryPlaceholder();
    }

    const canvas = document.createElement("canvas");
    canvas.className = "result-discovery-icon";
    canvas.width = SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT.width;
    canvas.height = SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT.height;
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      `${discovery.displayName}の種固有ピクセルアイコン（写真ではありません）`,
    );

    const context = canvas.getContext("2d");
    if (!context) {
      return this.createDiscoveryPlaceholder();
    }

    drawSpeciesPixelIconToCanvasContext(context, definition);
    return canvas;
  }

  private createDiscoveryPlaceholder(): HTMLElement {
    const placeholder = document.createElement("span");
    placeholder.className = "result-discovery-placeholder";
    placeholder.textContent = "ピクセルアイコンを表示できません";
    return placeholder;
  }

  private createDiscoveryCopy(
    discovery: DiveResultNewDiscovery,
  ): HTMLElement {
    const copy = document.createElement("div");
    copy.className = "result-discovery-copy";

    const name = this.createTextElement(
      "p",
      "result-discovery-name",
      discovery.displayName,
    );
    const scientific = this.createTextElement(
      "p",
      "result-discovery-scientific",
      discovery.acceptedScientificName,
    );
    scientific.setAttribute("lang", "la");
    const category = this.createTextElement(
      "p",
      "result-discovery-category",
      `カテゴリ / ${this.getCategoryLabel(discovery.category)}`,
    );
    copy.append(name, scientific, category);
    return copy;
  }

  private createTextElement(
    tagName: string,
    className: string,
    text: string,
  ): HTMLElement {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      fish: "魚類",
      gelatinous_plankton: "ゼラチン質生物",
      squid: "イカ類",
      octopus: "タコ類",
      crab: "カニ類",
      shrimp: "エビ類",
      other_invertebrate: "その他の無脊椎動物",
    };
    return labels[category] ?? category.replace(/_/gu, " ");
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
    const outcome = result.outcome === "cleared" ? "調査完了" : "潜航失敗";
    const newDiscoveryCount = Array.isArray(result.newDiscoveries)
      ? result.newDiscoveries.length
      : 0;
    const summary = `${outcome}。到達深度${this.formatDepth(result.reachedDepthM)}。` +
      `最終スコア${String(result.score)}。新発見${String(newDiscoveryCount)}種`;
    return result.isNewBest ? `${summary}。NEW BEST。` : `${summary}。`;
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

  private clearResultPresentation(): void {
    const textIds = [
      "result-outcome",
      "result-new-best",
      "result-score",
      "result-best-score",
      "result-dive-count",
      "result-clear-count",
      "result-depth",
      "result-fuel",
      "result-elapsed",
      "result-collected",
      "result-discovered",
      "result-scan-score",
      "result-new-species-score",
      "result-depth-score",
      "result-fuel-score",
    ];
    for (const id of textIds) {
      document.getElementById(id)?.replaceChildren();
    }

    const outcomeElement = document.getElementById("result-outcome");
    outcomeElement?.removeAttribute("data-outcome");
    const newBestElement = document.getElementById("result-new-best");
    newBestElement?.setAttribute("hidden", "");
    document.getElementById("result-discovery-list")?.replaceChildren();
    const empty = document.getElementById("result-discovery-empty");
    empty?.replaceChildren();
    empty?.setAttribute("hidden", "");
  }

  private readonly cleanup = (): void => {
    document.getElementById("result-ui")?.setAttribute("hidden", "");
    this.clearResultPresentation();
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
