import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const RESEARCH_FILES = [
  "docs/research/terra-fish.csv",
  "docs/research/terra-invertebrates.csv",
];
const OUTPUT = resolve(ROOT, "docs/SPECIES_CATALOG.csv");
const VERIFIED_AT = "2026-08-12";

const HEADERS = [
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

function parseCsv(text) {
  const input = text.replace(/^\uFEFF/, "");
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
  const [header, ...data] = rows;
  if (!header) throw new Error("CSV has no header");
  return data.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function normalizeName(value) {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

function slugify(value) {
  const ascii = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replaceAll("×", "x")
    .toLocaleLowerCase("en-US");
  const slug = ascii.replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  if (!slug) throw new Error(`Cannot create slug for ${value}`);
  return slug;
}

function categoryFor(value) {
  if (/Teleostei|Elasmobranchii|Holocephali|Chondrichthyes/u.test(value)) return "fish";
  const categories = {
    fish: "fish",
    jelly_ctenophore_plankton: "gelatinous_plankton",
    squid: "squid",
    octopus: "octopus",
    crab: "crab",
    shrimp: "shrimp",
    other_invertebrate: "other_invertebrate",
  };
  const category = categories[value];
  if (!category) throw new Error(`Unsupported research category: ${value}`);
  return category;
}

function numeric(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Invalid ${label}: ${value}`);
  return parsed;
}

function textForTags(row, category) {
  const source = `${row.depth_evidence_note} ${row.gameplay_visual_note}`.toLocaleLowerCase("en-US");
  const tags = ["deep_sea"];
  if (/hydrothermal|black smoker|vent[- ]field|vent sites?|mussels/iu.test(source)) {
    tags.push("hydrothermal_vent");
  } else if (/benthic|demersal|seafloor|sea floor|bottom|crawl|crawling|rock/iu.test(source)) {
    tags.push("seafloor");
  } else if (/pelagic|midwater|water column|bathypelagic|mesopelagic|tow interval/iu.test(source)) {
    tags.push("water_column");
  } else if (category === "crab" || category === "other_invertebrate") {
    tags.push("seafloor");
  } else {
    tags.push("water_column");
  }
  return tags;
}

function regionsFor(row) {
  const source = `${row.depth_evidence_note} ${row.gameplay_visual_note}`;
  const regions = [];
  const patterns = [
    ["Pacific", /Pacific/iu],
    ["Atlantic", /Atlantic/iu],
    ["Indian", /Indian Ocean/iu],
    ["Arctic", /Arctic/iu],
    ["Antarctic", /Antarctic|Southern Ocean/iu],
    ["Mediterranean", /Mediterranean/iu],
    ["Caribbean", /Caribbean/iu],
  ];
  for (const [region, pattern] of patterns) if (pattern.test(source)) regions.push(region);
  return regions;
}

function rarityFor(observedMax, spawnMin) {
  if (spawnMin >= 4500 || observedMax >= 7500) return "legendary";
  if (spawnMin >= 3000 || observedMax >= 5000) return "very_rare";
  if (spawnMin >= 1500 || observedMax >= 3500) return "rare";
  if (spawnMin >= 700 || observedMax >= 2500) return "uncommon";
  return "common";
}

function gameValues(rarity) {
  const values = {
    common: { weight: 1, score: 10, cooldown: 12 },
    uncommon: { weight: 0.65, score: 25, cooldown: 16 },
    rare: { weight: 0.35, score: 50, cooldown: 22 },
    very_rare: { weight: 0.15, score: 75, cooldown: 30 },
    legendary: { weight: 0.05, score: 100, cooldown: 40 },
  };
  const value = values[rarity];
  if (!value) throw new Error(`Unsupported rarity: ${rarity}`);
  return value;
}

function behaviorFor(category, tags) {
  if (category === "gelatinous_plankton") return "drift";
  if (category === "crab") return "crawl";
  if (category === "other_invertebrate" && tags.includes("seafloor")) return "stationary";
  return "swim";
}

async function getWormsRecords(names) {
  const records = new Map();
  for (let offset = 0; offset < names.length; offset += 50) {
    const query = new URLSearchParams();
    for (const name of names.slice(offset, offset + 50)) query.append("scientificnames[]", name);
    query.set("like", "false");
    query.set("marine_only", "true");
    query.set("extant_only", "true");
    const response = await fetch(`https://www.marinespecies.org/rest/AphiaRecordsByNames?${query.toString()}`);
    if (!response.ok) throw new Error(`WoRMS request failed: ${response.status}`);
    const payload = await response.json();
    const responseItems = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.value)
        ? payload.value
        : [payload];
    responseItems.forEach((item, index) => {
      const matches = Array.isArray(item) ? item : Array.isArray(item?.value) ? item.value : item?.scientificname ? [item] : [];
      const inputName = names[offset + index];
      const exact = matches.find(
        (record) =>
          record?.match_type === "exact" &&
          record.status === "accepted" &&
          record.rank === "Species" &&
          record.scientificname === inputName,
      );
      if (exact) records.set(inputName, exact);
    });
  }
  return records;
}

function makeRow(source, worms) {
  const auditedDepthSourceUrl = source.catalog_id === "I023" ? "https://doi.org/10.2988/0006-324x(2006)119%5B365%3Atsfmmc%5D2.0.co%3B2" : source.primary_source_url;
  const category = categoryFor(source.taxon_group);
  const observedMin = numeric(source.min_depth_m, `${source.catalog_id}.min_depth_m`);
  const observedMax = numeric(source.max_depth_m, `${source.catalog_id}.max_depth_m`);
  if (observedMin > observedMax) throw new Error(`Depth inversion in ${source.catalog_id}`);
  const spawnMin = Math.max(200, observedMin);
  const spawnMax = Math.min(6000, observedMax);
  if (spawnMin > spawnMax) throw new Error(`No 200-6000m spawn intersection in ${source.catalog_id}`);
  if (!worms || worms.scientificname !== source.scientific_name || worms.status !== "accepted" || worms.rank !== "Species") {
    throw new Error(`Unverified WoRMS record for ${source.catalog_id} ${source.scientific_name}`);
  }
  const tags = textForTags(source, category);
  const regions = regionsFor(source);
  const rarity = rarityFor(observedMax, spawnMin);
  const values = gameValues(rarity);
  const taxonomyUrl = `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${worms.AphiaID}`;
  const sourceCorrections = source.catalog_id === "I023" ? ["research_depth_url_normalized=https://doi.org/10.1111/j.1096-3642.2006.00277.x -> " + auditedDepthSourceUrl] : [];
  const corrections = source.taxonomy_source_url === taxonomyUrl
    ? []
    : [`research_taxonomy_url_normalized=${source.taxonomy_source_url} -> ${taxonomyUrl}`];
  const notes = [
    `depth_evidence=${source.depth_evidence_note}`,
    `size_note=${source.size_note}`,
    `visual_note=${source.gameplay_visual_note}`,
    `image_rights=${source.image_rights_note}`,
    "spawn_depth_policy=observed-range intersection with 200-6000m",
    "asset_status=reference-only; asset_id intentionally blank",
    "synonyms=not asserted; only exact accepted WoRMS name was adopted",
    ...sourceCorrections,
    ...corrections,
  ].join(" | ");
  return {
    source_catalog_id: source.catalog_id,
    slug: slugify(source.scientific_name),
    accepted_scientific_name: worms.scientificname,
    scientific_name_authorship: worms.authority,
    taxon_authority: "WoRMS",
    taxon_authority_id: String(worms.AphiaID),
    taxon_status: worms.status,
    synonyms: "[]",
    preferred_ja_name: source.japanese_name,
    ja_aliases: "[]",
    preferred_en_name: source.english_name || worms.scientificname,
    en_aliases: "[]",
    category,
    rank: worms.rank,
    phylum: worms.phylum,
    class: worms.class,
    order: worms.order,
    family: worms.family,
    observed_depth_min_m: observedMin,
    observed_depth_max_m: observedMax,
    spawn_depth_min_m: spawnMin,
    spawn_depth_max_m: spawnMax,
    habitat_tags: JSON.stringify(tags),
    ocean_regions: JSON.stringify(regions),
    game_rarity: rarity,
    spawn_weight: values.weight,
    spawn_conditions: JSON.stringify({
      depth_min_m: spawnMin,
      depth_max_m: spawnMax,
      habitat_tags: tags,
      ocean_regions: regions,
      respawn_cooldown_s: values.cooldown,
    }),
    behavior_id: behaviorFor(category, tags),
    score: values.score,
    asset_id: "",
    taxonomy_source_url: taxonomyUrl,
    depth_source_url: auditedDepthSourceUrl,
    fact_ja: `観察深度の出典記録は${observedMin}–${observedMax}m。`,
    fact_source_url: auditedDepthSourceUrl,
    image_reference_url: source.image_reference_url,
    last_verified_at: VERIFIED_AT,
    research_status: "verified",
    notes: `source_checked_date=${source.source_checked_date} | ${notes}`,
  };
}

const sourceRows = [];
for (const relativePath of RESEARCH_FILES) sourceRows.push(...parseCsv(await readFile(resolve(ROOT, relativePath), "utf8")));
const wormsByName = await getWormsRecords(sourceRows.map((row) => row.scientific_name));
const rows = sourceRows.map((row) => makeRow(row, wormsByName.get(row.scientific_name)));
const names = new Set();
const authorityIds = new Set();
for (const row of rows) {
  const nameKey = normalizeName(row.accepted_scientific_name);
  if (names.has(nameKey)) throw new Error(`Duplicate accepted name: ${row.accepted_scientific_name}`);
  if (authorityIds.has(row.taxon_authority_id)) throw new Error(`Duplicate AphiaID: ${row.taxon_authority_id}`);
  names.add(nameKey);
  authorityIds.add(row.taxon_authority_id);
}
const csv = [
  HEADERS.join(","),
  ...rows.map((row) => HEADERS.map((header) => csvEscape(row[header])).join(",")),
  "",
].join("\r\n");
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, csv, "utf8");
console.log(`Wrote ${rows.length} species to ${OUTPUT}`);
