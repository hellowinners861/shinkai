import catalogData from "../src/data/generated/speciesCatalog.json";
import { describe, expect, it } from "vitest";

type SpawnConditions = {
  depth_min_m: number;
  depth_max_m: number;
  habitat_tags: string[];
  ocean_regions: string[];
  respawn_cooldown_s: number;
};

type CatalogEntry = {
  source_catalog_id: string;
  slug: string;
  accepted_scientific_name: string;
  taxon_authority_id: number;
  taxon_status: string;
  category: string;
  observed_depth_min_m: number;
  observed_depth_max_m: number;
  spawn_depth_min_m: number;
  spawn_depth_max_m: number;
  habitat_tags: string[];
  ocean_regions: string[];
  game_rarity: string;
  spawn_weight: number;
  spawn_conditions: SpawnConditions;
  behavior_id: string;
  score: number;
  asset_id: string | null;
  taxonomy_source_url: string;
  depth_source_url: string;
  fact_ja: string;
  fact_source_url: string;
  research_status: string;
  display_name: string;
};

const catalog = catalogData as CatalogEntry[];

const categoryMinimums: Record<string, number> = {
  fish: 20,
  gelatinous_plankton: 16,
  squid: 16,
  octopus: 16,
  crab: 16,
  shrimp: 16,
};
const allowedCategories = new Set([
  "fish",
  "gelatinous_plankton",
  "squid",
  "octopus",
  "crab",
  "shrimp",
  "other_invertebrate",
]);
const allowedRarities = new Set(["common", "uncommon", "rare", "very_rare", "legendary"]);
const allowedBehaviors = new Set(["swim", "drift", "crawl", "stationary"]);
const depthBands: readonly [number, number][] = [
  [0, 200],
  [200, 1000],
  [1000, 4000],
  [4000, 6000],
];

function normalizedName(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

describe("generated species catalog", () => {
  it("contains at least 100 species and meets every category floor", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(100);
    const counts = new Map<string, number>();
    for (const entry of catalog) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    for (const [category, minimum] of Object.entries(categoryMinimums)) {
      expect(counts.get(category) ?? 0).toBeGreaterThanOrEqual(minimum);
    }
  });

  it("has unique normalized scientific names, slugs, and stable authority IDs", () => {
    const names = catalog.map((entry) => normalizedName(entry.accepted_scientific_name));
    const slugs = catalog.map((entry) => entry.slug);
    const authorityIds = catalog.map((entry) => String(entry.taxon_authority_id));
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(authorityIds).size).toBe(authorityIds.length);
  });

  it("keeps taxonomy, runtime enums, and unapproved asset state explicit", () => {
    for (const entry of catalog) {
      expect(entry.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
      expect(allowedCategories.has(entry.category)).toBe(true);
      expect(entry.taxon_status).toBe("accepted");
      expect(entry.taxon_authority_id).toBeGreaterThan(0);
      expect(allowedRarities.has(entry.game_rarity)).toBe(true);
      expect(allowedBehaviors.has(entry.behavior_id)).toBe(true);
      expect(entry.research_status).toBe("verified");
      expect(entry.asset_id).toBeNull();
      expect(entry.display_name.length).toBeGreaterThan(0);
      expect(entry.fact_ja.length).toBeGreaterThan(0);
    }
  });

  it("keeps observed and spawn depths valid and makes every species reachable", () => {
    for (const entry of catalog) {
      expect(entry.observed_depth_min_m).toBeGreaterThanOrEqual(0);
      expect(entry.observed_depth_min_m).toBeLessThanOrEqual(entry.observed_depth_max_m);
      expect(entry.spawn_depth_min_m).toBeGreaterThanOrEqual(0);
      expect(entry.spawn_depth_max_m).toBeLessThanOrEqual(6000);
      expect(entry.spawn_depth_min_m).toBeLessThanOrEqual(entry.spawn_depth_max_m);
      expect(entry.spawn_depth_min_m).toBeGreaterThanOrEqual(entry.observed_depth_min_m);
      expect(entry.spawn_depth_max_m).toBeLessThanOrEqual(Math.min(entry.observed_depth_max_m, 6000));
      expect(entry.spawn_conditions.depth_min_m).toBe(entry.spawn_depth_min_m);
      expect(entry.spawn_conditions.depth_max_m).toBe(entry.spawn_depth_max_m);
      expect(entry.spawn_conditions.habitat_tags.length).toBeGreaterThan(0);
      expect(
        depthBands.some(
          ([bandMin, bandMax]) =>
            entry.spawn_depth_min_m <= bandMax && entry.spawn_depth_max_m >= bandMin,
        ),
      ).toBe(true);
    }
  });

  it("uses HTTPS source URLs and never emits a runtime image hotlink", () => {
    for (const entry of catalog) {
      for (const key of ["taxonomy_source_url", "depth_source_url", "fact_source_url"] as const) {
        const url = new URL(entry[key]);
        expect(url.protocol).toBe("https:");
        expect(url.hostname.length).toBeGreaterThan(0);
      }
      expect(entry).not.toHaveProperty("image_reference_url");
    }
  });
});
