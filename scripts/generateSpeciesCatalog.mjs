import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const INPUT = resolve(ROOT, "docs/SPECIES_CATALOG.csv");
const JAPANESE_NAMES_INPUT = resolve(ROOT, "docs/SPECIES_JA_DISPLAY_NAMES.csv");
const OUTPUT = resolve(ROOT, "src/data/generated/speciesCatalog.json");

const REQUIRED_COLUMNS = [
  "source_catalog_id",
  "slug",
  "accepted_scientific_name",
  "scientific_name_authorship",
  "taxon_authority",
  "taxon_authority_id",
  "taxon_status",
  "synonyms",
  "preferred_ja_name",
  "ja_aliases",
  "preferred_en_name",
  "en_aliases",
  "category",
  "rank",
  "phylum",
  "class",
  "order",
  "family",
  "observed_depth_min_m",
  "observed_depth_max_m",
  "spawn_depth_min_m",
  "spawn_depth_max_m",
  "habitat_tags",
  "ocean_regions",
  "game_rarity",
  "spawn_weight",
  "spawn_conditions",
  "behavior_id",
  "score",
  "asset_id",
  "taxonomy_source_url",
  "depth_source_url",
  "fact_ja",
  "fact_source_url",
  "image_reference_url",
  "last_verified_at",
  "research_status",
  "notes",
];

const CATEGORIES = new Set([
  "fish",
  "gelatinous_plankton",
  "squid",
  "octopus",
  "crab",
  "shrimp",
  "other_invertebrate",
]);
const RARITIES = new Set(["common", "uncommon", "rare", "very_rare", "legendary"]);
const BEHAVIORS = new Set(["swim", "drift", "crawl", "stationary"]);
const RESEARCH_STATUSES = new Set(["draft", "verified", "release_approved"]);
const JAPANESE_NAME_STATUSES = new Set(["established", "localized"]);
const JAPANESE_CHARACTER_PATTERN = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const DEPTH_BANDS = [
  [0, 200],
  [200, 1000],
  [1000, 4000],
  [4000, 6000],
];

function parseCsv(text, requiredColumns = REQUIRED_COLUMNS) {
  const input = text.replace(/^\uFEFF/u, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  const header = rows.shift();
  if (!header || header.length === 0) throw new Error("CSV has no header");
  const missing = requiredColumns.filter((column) => !header.includes(column));
  if (missing.length > 0) throw new Error("CSV is missing columns: " + missing.join(", "));
  return rows.map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] || ""])),
  );
}

function normalizeName(value) {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

function parseInteger(value, label, minimum, maximum) {
  if (!/^-?\d+$/u.test(value)) throw new Error(label + " must be an integer");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(label + " is outside the allowed range");
  }
  return parsed;
}

function parseJson(value, label, expectedType) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(label + " is not valid JSON: " + String(error));
  }
  if (expectedType === "array" && !Array.isArray(parsed)) {
    throw new Error(label + " must be a JSON array");
  }
  if (expectedType === "object" && (parsed === null || Array.isArray(parsed) || typeof parsed !== "object")) {
    throw new Error(label + " must be a JSON object");
  }
  return parsed;
}

function assertHttpsUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new Error(label + " is not a URL: " + String(error));
  }
  if (parsed.protocol !== "https:" || !parsed.hostname) {
    throw new Error(label + " must be an HTTPS URL");
  }
  return value;
}

function validateJapaneseDisplayNames(catalogRows, sidecarRows) {
  const catalogIds = new Set();
  for (const row of catalogRows) {
    const id = row.source_catalog_id;
    if (!id || id.trim() !== id) {
      throw new Error('catalog source_catalog_id must be nonempty and trimmed');
    }
    if (catalogIds.has(id)) {
      throw new Error('catalog has duplicate source_catalog_id ' + id);
    }
    catalogIds.add(id);
  }

  const sidecarById = new Map();
  for (const [index, row] of sidecarRows.entries()) {
    const prefix = 'Japanese display-name row ' + (index + 2);
    const id = row.source_catalog_id;
    const displayName = row.display_name_ja.normalize('NFC').trim();
    if (!id || id.trim() !== id) {
      throw new Error(prefix + ': source_catalog_id must be nonempty and trimmed');
    }
    if (sidecarById.has(id)) {
      throw new Error(prefix + ': duplicate source_catalog_id ' + id);
    }
    if (!displayName || !JAPANESE_CHARACTER_PATTERN.test(displayName)) {
      throw new Error(prefix + ' (' + id + '): display_name_ja must contain Japanese characters');
    }
    if (!JAPANESE_NAME_STATUSES.has(row.name_status)) {
      throw new Error(prefix + ' (' + id + '): name_status must be established or localized');
    }
    sidecarById.set(id, {
      display_name_ja: displayName,
      name_status: row.name_status,
    });
  }

  for (const id of catalogIds) {
    if (!sidecarById.has(id)) {
      throw new Error('Japanese display-name sidecar is missing catalog ID ' + id);
    }
  }
  for (const id of sidecarById.keys()) {
    if (!catalogIds.has(id)) {
      throw new Error('Japanese display-name sidecar has extra catalog ID ' + id);
    }
  }

  for (const row of catalogRows) {
    const sidecar = sidecarById.get(row.source_catalog_id);
    const preferredJapaneseName = row.preferred_ja_name.normalize('NFC').trim();
    if (sidecar.name_status === 'established') {
      if (!preferredJapaneseName) {
        throw new Error(row.source_catalog_id + ': established display name requires preferred_ja_name');
      }
      if (preferredJapaneseName !== sidecar.display_name_ja) {
        throw new Error(row.source_catalog_id + ': established display name must match preferred_ja_name');
      }
    } else if (preferredJapaneseName) {
      throw new Error(row.source_catalog_id + ': localized display name must not populate preferred_ja_name');
    }
  }

  return sidecarById;
}
function validateRow(row, index, indexes) {
  const prefix = "row " + (index + 2) + " (" + row.source_catalog_id + ")";
  if (!row.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(row.slug)) {
    throw new Error(prefix + ": invalid slug");
  }
  if (!row.accepted_scientific_name || !row.scientific_name_authorship) {
    throw new Error(prefix + ": accepted name and authorship are required");
  }
  if (row.taxon_authority !== "WoRMS" || !/^\d+$/u.test(row.taxon_authority_id)) {
    throw new Error(prefix + ": stable WoRMS authority ID is required");
  }
  if (row.taxon_status !== "accepted" || row.rank !== "Species") {
    throw new Error(prefix + ": only accepted species records are allowed");
  }
  if (!CATEGORIES.has(row.category)) throw new Error(prefix + ": invalid category");
  if (!RARITIES.has(row.game_rarity)) throw new Error(prefix + ": invalid game_rarity");
  if (!BEHAVIORS.has(row.behavior_id)) throw new Error(prefix + ": invalid behavior_id");
  if (!RESEARCH_STATUSES.has(row.research_status)) {
    throw new Error(prefix + ": invalid research_status");
  }
  if (!row.preferred_en_name || !row.fact_ja) throw new Error(prefix + ": runtime names/fact are required");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(row.last_verified_at)) {
    throw new Error(prefix + ": invalid last_verified_at");
  }
  const observedMin = parseInteger(row.observed_depth_min_m, prefix + ".observed_depth_min_m", 0, 20000);
  const observedMax = parseInteger(row.observed_depth_max_m, prefix + ".observed_depth_max_m", 0, 20000);
  const spawnMin = parseInteger(row.spawn_depth_min_m, prefix + ".spawn_depth_min_m", 0, 6000);
  const spawnMax = parseInteger(row.spawn_depth_max_m, prefix + ".spawn_depth_max_m", 0, 6000);
  if (observedMin > observedMax || spawnMin > spawnMax) throw new Error(prefix + ": depth range is inverted");
  if (spawnMin < Math.max(0, observedMin) || spawnMax > Math.min(6000, observedMax)) {
    throw new Error(prefix + ": spawn depth is not within observed range and 0-6000m");
  }
  const habitatTags = parseJson(row.habitat_tags, prefix + ".habitat_tags", "array");
  const oceanRegions = parseJson(row.ocean_regions, prefix + ".ocean_regions", "array");
  const conditions = parseJson(row.spawn_conditions, prefix + ".spawn_conditions", "object");
  if (conditions.depth_min_m !== spawnMin || conditions.depth_max_m !== spawnMax) {
    throw new Error(prefix + ": spawn_conditions depth does not match columns");
  }
  if (!Array.isArray(conditions.habitat_tags) || !Array.isArray(conditions.ocean_regions)) {
    throw new Error(prefix + ": spawn_conditions must contain arrays");
  }
  if (JSON.stringify(conditions.habitat_tags) !== JSON.stringify(habitatTags)) {
    throw new Error(prefix + ": habitat_tags mismatch");
  }
  if (JSON.stringify(conditions.ocean_regions) !== JSON.stringify(oceanRegions)) {
    throw new Error(prefix + ": ocean_regions mismatch");
  }
  parseJson(row.synonyms, prefix + ".synonyms", "array");
  parseJson(row.ja_aliases, prefix + ".ja_aliases", "array");
  parseJson(row.en_aliases, prefix + ".en_aliases", "array");
  const weight = Number(row.spawn_weight);
  const score = parseInteger(row.score, prefix + ".score", 10, 100);
  if (!Number.isFinite(weight) || weight <= 0) throw new Error(prefix + ": spawn_weight must be positive");
  if (row.research_status === "release_approved" && !row.asset_id) {
    throw new Error(prefix + ": release_approved requires asset_id");
  }
  if (row.research_status !== "release_approved" && row.asset_id) {
    throw new Error(prefix + ": unapproved row must not claim asset_id");
  }
  for (const [column, value] of [
    ["taxonomy_source_url", row.taxonomy_source_url],
    ["depth_source_url", row.depth_source_url],
    ["fact_source_url", row.fact_source_url],
    ["image_reference_url", row.image_reference_url],
  ]) {
    if (!value) throw new Error(prefix + ": " + column + " is required");
    assertHttpsUrl(value, prefix + "." + column);
  }
  const nameKey = normalizeName(row.accepted_scientific_name);
  const authorityKey = row.taxon_authority + ":" + row.taxon_authority_id;
  for (const [key, value] of [
    ["name", nameKey],
    ["slug", row.slug],
    ["authority", authorityKey],
  ]) {
    if (indexes[key].has(value)) throw new Error(prefix + ": duplicate " + key + " " + value);
    indexes[key].add(value);
  }
}

function toEntry(row, japaneseDisplayNames) {
  const conditions = parseJson(row.spawn_conditions, row.slug + ".spawn_conditions", "object");
  const japaneseDisplayName = japaneseDisplayNames.get(row.source_catalog_id);
  return {
    source_catalog_id: row.source_catalog_id,
    slug: row.slug,
    accepted_scientific_name: row.accepted_scientific_name,
    scientific_name_authorship: row.scientific_name_authorship,
    taxon_authority: row.taxon_authority,
    taxon_authority_id: Number(row.taxon_authority_id),
    taxon_status: row.taxon_status,
    synonyms: parseJson(row.synonyms, row.slug + ".synonyms", "array"),
    preferred_ja_name: row.preferred_ja_name || null,
    preferred_en_name: row.preferred_en_name,
    display_name_ja: japaneseDisplayName.display_name_ja,
    ja_name_status: japaneseDisplayName.name_status,
    category: row.category,
    rank: row.rank,
    phylum: row.phylum,
    class: row.class,
    order: row.order,
    family: row.family,
    observed_depth_min_m: Number(row.observed_depth_min_m),
    observed_depth_max_m: Number(row.observed_depth_max_m),
    spawn_depth_min_m: Number(row.spawn_depth_min_m),
    spawn_depth_max_m: Number(row.spawn_depth_max_m),
    habitat_tags: parseJson(row.habitat_tags, row.slug + ".habitat_tags", "array"),
    ocean_regions: parseJson(row.ocean_regions, row.slug + ".ocean_regions", "array"),
    game_rarity: row.game_rarity,
    spawn_weight: Number(row.spawn_weight),
    spawn_conditions: conditions,
    behavior_id: row.behavior_id,
    score: Number(row.score),
    asset_id: row.asset_id || null,
    taxonomy_source_url: row.taxonomy_source_url,
    depth_source_url: row.depth_source_url,
    fact_ja: row.fact_ja,
    fact_source_url: row.fact_source_url,
    last_verified_at: row.last_verified_at,
    research_status: row.research_status,
    display_name: japaneseDisplayName.display_name_ja,
  };
}

const rows = parseCsv(await readFile(INPUT, "utf8"));
const japaneseDisplayRows = parseCsv(
  await readFile(JAPANESE_NAMES_INPUT, "utf8"),
  ["source_catalog_id", "display_name_ja", "name_status"],
);
const japaneseDisplayNames = validateJapaneseDisplayNames(rows, japaneseDisplayRows);
const indexes = { name: new Set(), slug: new Set(), authority: new Set() };
rows.forEach((row, index) => validateRow(row, index, indexes));
const runtimeRows = rows.filter((row) => row.research_status !== "draft");
runtimeRows.sort((left, right) => left.slug.localeCompare(right.slug, "en"));
const entries = runtimeRows.map((row) => toEntry(row, japaneseDisplayNames));
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify(entries, null, 2) + "\n", "utf8");
console.log("Generated " + entries.length + " species entries from " + rows.length + " catalog rows.");
