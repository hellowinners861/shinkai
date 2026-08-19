import speciesCatalogData from "../data/generated/speciesCatalog.json";
import { APPROVED_SPECIES_ASSETS } from "../data/speciesAssets";
import {
  SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT,
  drawSpeciesPixelIconToCanvasContext,
  getSpeciesPixelIconDefinitionForSpecies,
} from "../game/speciesPixelIcons";
import {
  countCollectedSpecies,
  type DiscoveryProgress,
} from "./discoveryStore";
import {
  getJapaneseNameStatusLabel,
  getSpeciesCategoryLabel,
  type JapaneseNameStatus,
} from "./speciesPresentation";

type CatalogEntry = (typeof speciesCatalogData)[number];

export const CATALOG_CATEGORY_IDS = [
  "all",
  "fish",
  "gelatinous_plankton",
  "squid",
  "octopus",
  "crab",
  "shrimp",
  "other_invertebrate",
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORY_IDS)[number];

const CATALOG = speciesCatalogData as readonly CatalogEntry[];
const APPROVED_ASSET_BY_CATALOG_ID = new Map<
  string,
  (typeof APPROVED_SPECIES_ASSETS)[number]
>(
  APPROVED_SPECIES_ASSETS.map((asset) => [asset.sourceCatalogId, asset]),
);

export function isCatalogCategory(value: string | undefined): value is CatalogCategory {
  return value !== undefined && CATALOG_CATEGORY_IDS.includes(
    value as CatalogCategory,
  );
}

/** Returns the generated Japanese runtime display name only. */
export function getSpeciesDisplayName(entry: CatalogEntry): {
  primary: string;
  secondary: undefined;
} {
  const displayName = cleanText(entry.display_name_ja) ??
    cleanText(entry.display_name) ??
    entry.accepted_scientific_name;
  return { primary: displayName, secondary: undefined };
}

/** Renders the catalog into the existing HTML console overlay. */
export function renderCatalog(
  root: HTMLElement,
  progress: DiscoveryProgress,
  selectedCategory: CatalogCategory,
): CatalogCategory {
  const category = isCatalogCategory(selectedCategory) ? selectedCategory : "all";
  const categoryNavigation = root.querySelector<HTMLElement>(
    "[data-catalog-categories]",
  );
  const list = root.querySelector<HTMLElement>("[data-catalog-list]");
  const progressReadout = root.querySelector<HTMLElement>(
    "[data-catalog-progress]",
  );
  if (!categoryNavigation || !list || !progressReadout) {
    return category;
  }

  renderCategoryNavigation(categoryNavigation, category);
  renderProgress(progressReadout, progress);
  list.replaceChildren();

  const entries = category === "all"
    ? CATALOG
    : CATALOG.filter((entry) => entry.category === category);
  const fragment = document.createDocumentFragment();
  for (const entry of entries) {
    fragment.appendChild(createCatalogCard(entry, progress));
  }
  list.appendChild(fragment);
  return category;
}

function renderCategoryNavigation(
  navigation: HTMLElement,
  selectedCategory: CatalogCategory,
): void {
  const counts = new Map<string, number>();
  for (const entry of CATALOG) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }

  navigation.replaceChildren();
  for (const category of CATALOG_CATEGORY_IDS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "catalog-filter";
    button.dataset.catalogCategory = category;
    button.setAttribute("aria-pressed", String(category === selectedCategory));
    button.setAttribute("aria-label", `${getCategoryLabel(category)}を表示`);
    const count = category === "all" ? CATALOG.length : counts.get(category) ?? 0;
    button.append(
      `${getCategoryLabel(category)} `,
      createCountBadge(count),
    );
    navigation.appendChild(button);
  }
}

function createCountBadge(count: number): HTMLElement {
  const badge = document.createElement("span");
  badge.className = "catalog-filter-count";
  badge.setAttribute("aria-hidden", "true");
  badge.textContent = String(count);
  return badge;
}

function renderProgress(
  readout: HTMLElement,
  progress: DiscoveryProgress,
): void {
  const knownNames = new Set(CATALOG.map((entry) => entry.accepted_scientific_name));
  const discoveredCount = [...progress.discoveredSpecies].filter((name) =>
    knownNames.has(name),
  ).length;
  const collectedCount = Object.entries(progress.collectedSpecies).reduce(
    (total, [name, count]) => knownNames.has(name) ? total + count : total,
    0,
  );
  const safeCollectedCount = Number.isFinite(collectedCount)
    ? collectedCount
    : countCollectedSpecies(progress);
  readout.replaceChildren(
    `発見 ${discoveredCount.toLocaleString("en-US")} / ${CATALOG.length.toLocaleString("en-US")} 種　獲得 ${safeCollectedCount.toLocaleString("en-US")} 回`,
  );
}

function createCatalogCard(
  entry: CatalogEntry,
  progress: DiscoveryProgress,
): HTMLElement {
  const discovered = progress.discoveredSpecies.has(entry.accepted_scientific_name);
  const card = document.createElement("article");
  card.className = "catalog-card";
  card.dataset.catalogState = discovered ? "discovered" : "locked";
  card.setAttribute("role", "listitem");

  if (!discovered) {
    card.setAttribute("aria-label", "未発見の生物記録");
    const status = createTextElement("p", "catalog-card-status", "LOCKED / 未発見");
    const title = createTextElement("h3", "catalog-card-title", "未発見の記録");
    const copy = createTextElement(
      "p",
      "catalog-card-locked-copy",
      "潜航中に観測すると、この記録の詳細が開示されます。",
    );
    const category = createDetailList([
      ["カテゴリ", getCategoryLabel(entry.category)],
    ]);
    card.append(status, title, copy, category);
    return card;
  }

  const { primary } = getSpeciesDisplayName(entry);
  const collectedCount = progress.collectedSpecies[entry.accepted_scientific_name] ?? 0;
  const status = createTextElement("p", "catalog-card-status", "DISCOVERED / 発見済み");
  const title = createTextElement("h3", "catalog-card-title", primary);
  const header = document.createElement("header");
  header.className = "catalog-card-header";
  const nameStatus = createTextElement(
    "p",
    "catalog-card-name-status",
    getJapaneseNameStatusLabel(entry.ja_name_status as JapaneseNameStatus),
  );
  header.append(status, title, nameStatus);

  const media = createSpeciesMedia(entry, primary);
  const scientificName = createTextElement(
    "p",
    "catalog-card-scientific-name",
    `学名 / ${entry.accepted_scientific_name}`,
  );
  scientificName.setAttribute("lang", "la");
  const collectionStatus = createTextElement(
    "p",
    "catalog-card-collection",
    `獲得 ${collectedCount.toLocaleString("en-US")}回`,
  );
  const details = createDetailList([
    ["カテゴリ", getCategoryLabel(entry.category)],
    ["生息深度", formatDepth(entry.spawn_depth_min_m, entry.spawn_depth_max_m)],
    ["事実", entry.fact_ja],
  ]);
  const sources = createSourceLinks(entry);
  card.append(header, media, scientificName, collectionStatus, details, sources);
  return card;
}

function createSpeciesMedia(entry: CatalogEntry, name: string): HTMLElement {
  const asset = APPROVED_ASSET_BY_CATALOG_ID.get(entry.source_catalog_id);
  if (asset?.usageStatus === "release_approved") {
    const media = document.createElement("figure");
    media.className = "catalog-card-media catalog-photo-media";
    const stage = document.createElement("div");
    stage.className = "catalog-media-stage";
    const image = document.createElement("img");
    image.src = asset.url;
    image.alt = `${name}の記録画像`;
    image.loading = "lazy";
    stage.appendChild(image);
    media.append(stage, createPhotoCredit(asset));
    return media;
  }

  const media = document.createElement("div");
  media.className = "catalog-card-media";
  const stage = document.createElement("div");
  stage.className = "catalog-media-stage";
  const definition = getSpeciesPixelIconDefinitionForSpecies({
    sourceCatalogId: entry.source_catalog_id,
    category: entry.category,
  });
  if (!definition) {
    stage.appendChild(
      createTextElement(
        "span",
        "catalog-image-pending",
        "ピクセルアイコンを表示できません",
      ),
    );
    media.appendChild(stage);
    return media;
  }

  const canvas = document.createElement("canvas");
  canvas.className = "catalog-species-icon";
  canvas.width = SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT.width;
  canvas.height = SPECIES_PIXEL_ICON_LOGICAL_VIEWPORT.height;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `${name}の種固有ピクセルアイコン（写真ではありません）`,
  );
  const context = canvas.getContext("2d");
  if (!context) {
    stage.appendChild(
      createTextElement(
        "span",
        "catalog-image-pending",
        "ピクセルアイコンを表示できません",
      ),
    );
    media.appendChild(stage);
    return media;
  }

  drawSpeciesPixelIconToCanvasContext(context, definition);
  stage.appendChild(canvas);
  media.appendChild(stage);
  return media;
}

function createPhotoCredit(
  asset: (typeof APPROVED_SPECIES_ASSETS)[number],
): HTMLElement {
  const caption = document.createElement("figcaption");
  caption.className = "catalog-photo-credit";
  caption.append(
    `作者: ${asset.creator} / ライセンス: `,
    createExternalLink(asset.licenseUrl, asset.licenseId),
    " / ",
    createExternalLink(asset.sourcePageUrl, "出典ページ"),
  );
  return caption;
}

function createExternalLink(url: string, label: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.textContent = label;
  return link;
}

function createDetailList(details: readonly [string, string][]): HTMLElement {
  const list = document.createElement("dl");
  list.className = "catalog-card-details";
  for (const [label, value] of details) {
    const term = createTextElement("dt", "", label);
    const description = createTextElement("dd", "", value);
    list.append(term, description);
  }
  return list;
}

function createSourceLinks(entry: CatalogEntry): HTMLElement {
  const navigation = document.createElement("nav");
  navigation.className = "catalog-card-sources";
  navigation.setAttribute("aria-label", "出典リンク");
  const links: readonly [string, string][] = [
    [entry.taxonomy_source_url, "分類出典"],
    [entry.depth_source_url, "深度出典"],
    [entry.fact_source_url, "事実出典"],
  ];
  for (const [url, label] of links) {
    if (!url.startsWith("https://")) {
      continue;
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = label;
    navigation.appendChild(link);
  }
  return navigation;
}

function formatDepth(minimum: number, maximum: number): string {
  const min = Number.isFinite(minimum) ? Math.max(0, Math.floor(minimum)) : 0;
  const max = Number.isFinite(maximum) ? Math.max(min, Math.floor(maximum)) : min;
  return `${min.toLocaleString("en-US")}–${max.toLocaleString("en-US")} m`;
}

function getCategoryLabel(category: string): string {
  return category === "all" ? "全カテゴリ" : getSpeciesCategoryLabel(category);
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.normalize("NFC").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function createTextElement(
  tagName: string,
  className: string,
  text: string,
): HTMLElement {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  return element;
}
