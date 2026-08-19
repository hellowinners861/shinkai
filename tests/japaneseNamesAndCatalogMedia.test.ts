// @ts-expect-error Vitest runs with the repository Node runtime; @types/node is intentionally not a production dependency.
import { readFileSync } from "node:fs";
// @ts-expect-error Vitest runs with the repository Node runtime; @types/node is intentionally not a production dependency.
import { resolve } from "node:path";
import catalogData from "../src/data/generated/speciesCatalog.json";
import { describe, expect, it } from "vitest";
import {
  getJapaneseNameStatusLabel,
  getUnknownSpeciesLabel,
} from "../src/catalog/speciesPresentation";
import { getLargeCreatureEventCandidate } from "../src/game/largeCreatureEventRules";

type NameSidecarRow = {
  source_catalog_id: string;
  display_name_ja: string;
  name_status: "established" | "localized";
};

type GeneratedCatalogRow = (typeof catalogData)[number];

declare const process: { cwd(): string };

const root = resolve(process.cwd());
const sidecarRows: NameSidecarRow[] = readFileSync(
  resolve(root, "docs/SPECIES_JA_DISPLAY_NAMES.csv"),
  "utf8",
).trim().split(/\r?\n/u).slice(1).map((line: string) => {
  const [sourceCatalogId, displayNameJa, nameStatus] = line.split(",");
  return {
    source_catalog_id: sourceCatalogId ?? "",
    display_name_ja: displayNameJa ?? "",
    name_status: nameStatus as NameSidecarRow["name_status"],
  } satisfies NameSidecarRow;
});
const sidecarById = new Map(
  sidecarRows.map((row: NameSidecarRow) => [row.source_catalog_id, row]),
);
const catalog = catalogData as readonly GeneratedCatalogRow[];

describe("V6 Japanese display-name sidecar", () => {
  it("covers exactly the 149 generated catalog IDs", () => {
    expect(sidecarRows).toHaveLength(149);
    expect(new Set(sidecarById.keys()).size).toBe(149);
    expect(new Set(catalog.map((entry) => entry.source_catalog_id))).toEqual(
      new Set(sidecarById.keys()),
    );
  });

  it("keeps Japanese labels, status counts, and generated equality aligned", () => {
    expect(sidecarRows.filter((row) => row.name_status === "established")).toHaveLength(78);
    expect(sidecarRows.filter((row) => row.name_status === "localized")).toHaveLength(71);
    for (const row of sidecarRows) {
      expect(row.display_name_ja).toMatch(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u);
      const generated = catalog.find((entry) => entry.source_catalog_id === row.source_catalog_id);
      expect(generated?.display_name_ja).toBe(row.display_name_ja);
      expect(generated?.ja_name_status).toBe(row.name_status);
      expect(generated?.display_name).toBe(row.display_name_ja);
      if (row.name_status === "established") {
        expect(generated?.preferred_ja_name).toBe(row.display_name_ja);
      } else {
        expect(generated?.preferred_ja_name).toBeNull();
      }
    }
  });

  it("uses Japanese unknown-category labels and exact card status copy", () => {
    expect(getUnknownSpeciesLabel("fish")).toBe("未同定 / 魚類");
    expect(getUnknownSpeciesLabel("gelatinous_plankton")).toBe("未同定 / ゼラチン質生物");
    expect(getUnknownSpeciesLabel("other_invertebrate")).toBe("未同定 / その他の無脊椎動物");
    expect(getJapaneseNameStatusLabel("established")).toBe("和名");
    expect(getJapaneseNameStatusLabel("localized")).toBe("ゲーム内呼称 / 標準和名未確認");
  });

  it("uses the authoritative Japanese large-creature display label", () => {
    expect(getLargeCreatureEventCandidate("I022")?.displayName).toBe("ダイオウホウズキイカ");
  });
});

describe("V6 catalog media contract", () => {
  it("keeps media in a fixed-ratio stage without direct image stretching", () => {
    const css = readFileSync(resolve(root, "src/style.css"), "utf8");
    const catalogUi = readFileSync(resolve(root, "src/catalog/catalogUi.ts"), "utf8");
    expect(css).toMatch(/\.catalog-media-stage\s*\{[\s\S]*aspect-ratio:\s*4 \/ 3/u);
    expect(css).toContain("max-width: 16rem;");
    expect(css).toMatch(/\.catalog-media-stage\s*\{[\s\S]*overflow: hidden;/u);
    expect(css).toMatch(/\.catalog-media-stage img\s*\{[\s\S]*width: auto;[\s\S]*height: auto;[\s\S]*object-fit: contain;/u);
    expect(css).toMatch(/\.catalog-media-stage canvas\.catalog-species-icon\s*\{[\s\S]*width: min\(100%, 8rem\);[\s\S]*height: auto;/u);
    expect(css).not.toContain(".catalog-card-media img");
    expect(catalogUi).toContain('stage.className = "catalog-media-stage"');
    expect(catalogUi).not.toContain("catalog-card-secondary-name");
  });
});
