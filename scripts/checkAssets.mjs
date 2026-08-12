import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { MANIFEST_HEADERS, parseCsv, targetRows } from "./prepareCommonsAssets.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MANIFEST_PATH = resolve(ROOT, "assets/manifest.csv");
const CATALOG_PATH = resolve(ROOT, "docs/SPECIES_CATALOG.csv");
const SPECIES_DIR = resolve(ROOT, "assets/species");
const ALLOWED_STATUSES = new Set(["reference_only", "license_review", "release_approved"]);

function allowedLicense(value) {
  if (/^(Public domain|CC0(?: 1\.0)?)$/iu.test(value)) return true;
  return /^CC BY(?:-SA)?(?: \d+(?:\.\d+)?)?$/iu.test(value) && !/\b(?:NC|ND)\b/u.test(value);
}

function assertHttps(value, label) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname) throw new Error(`${label} must be HTTPS`);
}

function fail(errors, message) {
  errors.push(message);
}

async function main() {
  const errors = [];
  const manifestText = await readFile(MANIFEST_PATH, "utf8");
  const header = manifestText.replace(/^\uFEFF/u, "").split(/\r?\n/u, 1)[0].split(",");
  if (JSON.stringify(header) !== JSON.stringify(MANIFEST_HEADERS)) {
    fail(errors, "manifest header does not match the required schema");
  }
  const rows = parseCsv(manifestText);
  const catalogRows = parseCsv(await readFile(CATALOG_PATH, "utf8"));
  const targets = targetRows(catalogRows);
  const targetById = new Map(targets.map((row) => [row.source_catalog_id, row]));
  if (rows.length !== targets.length) fail(errors, `manifest must contain ${targets.length} target rows, found ${rows.length}`);

  const ids = new Set();
  const approvedPaths = new Set();
  const approvedByCategory = new Map();
  const missing = [];
  for (const [index, row] of rows.entries()) {
    const label = `row ${index + 2} (${row.source_catalog_id || "missing id"})`;
    const target = targetById.get(row.source_catalog_id);
    if (!target) fail(errors, `${label}: source_catalog_id is outside the 100-species release target`);
    if (ids.has(row.source_catalog_id)) fail(errors, `${label}: duplicate source_catalog_id`);
    ids.add(row.source_catalog_id);
    if (target && (row.accepted_scientific_name !== target.accepted_scientific_name || row.category !== target.category)) {
      fail(errors, `${label}: taxon/category does not match SPECIES_CATALOG.csv`);
    }
    if (!ALLOWED_STATUSES.has(row.usage_status)) fail(errors, `${label}: invalid usage_status`);

    if (row.usage_status !== "release_approved") {
      missing.push(`${row.source_catalog_id}:${row.accepted_scientific_name}`);
      for (const field of ["asset_id", "local_path", "sha256"]) {
        if (row[field]) fail(errors, `${label}: ${field} must be empty unless release_approved`);
      }
      continue;
    }

    const required = [
      "asset_id", "local_path", "source_page_url", "original_file_url", "title", "creator",
      "license_id", "license_url", "attribution_text", "modifications", "downloaded_at",
      "sha256", "reviewed_by", "reviewed_at",
    ];
    for (const field of required) if (!row[field]) fail(errors, `${label}: ${field} is required`);
    if (!allowedLicense(row.license_id)) fail(errors, `${label}: disallowed or ambiguous license ${row.license_id}`);
    for (const field of ["source_page_url", "original_file_url", "license_url"]) {
      try { assertHttps(row[field], `${label}.${field}`); } catch (error) { fail(errors, String(error)); }
    }
    for (const field of ["commercial_use_allowed", "derivatives_allowed", "redistribution_allowed"]) {
      if (row[field] !== "true") fail(errors, `${label}: ${field} must be true`);
    }
    if (!/^assets\/species\/[a-z0-9][a-z0-9.-]+$/u.test(row.local_path)) {
      fail(errors, `${label}: invalid local_path`);
      continue;
    }
    const absolutePath = resolve(ROOT, row.local_path);
    if (!absolutePath.startsWith(`${SPECIES_DIR}${sep}`)) {
      fail(errors, `${label}: local_path escapes assets/species`);
      continue;
    }
    try {
      const bytes = await readFile(absolutePath);
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile() || bytes.length === 0) fail(errors, `${label}: local asset is empty or not a file`);
      if (bytes.length > 200 * 1024) fail(errors, `${label}: local asset exceeds the 200KB mobile target`);
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (digest !== row.sha256) fail(errors, `${label}: sha256 mismatch`);
      approvedPaths.add(row.local_path.replaceAll("\\", "/"));
      approvedByCategory.set(row.category, (approvedByCategory.get(row.category) ?? 0) + 1);
    } catch (error) {
      fail(errors, `${label}: cannot read local asset: ${String(error)}`);
    }
  }

  for (const target of targets) if (!ids.has(target.source_catalog_id)) fail(errors, `missing manifest target ${target.source_catalog_id}`);
  const diskFiles = (await readdir(SPECIES_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name !== ".gitkeep")
    .map((entry) => `assets/species/${entry.name}`);
  for (const file of diskFiles) if (!approvedPaths.has(file)) fail(errors, `orphan/unapproved local asset: ${file}`);
  if (approvedPaths.size === 0) fail(errors, "manifest has no release_approved local assets");

  if (errors.length > 0) throw new Error(`Asset inspection failed:\n- ${errors.join("\n- ")}`);
  const coverage = [...approvedByCategory.entries()].map(([category, count]) => `${category}=${count}`).join(", ");
  console.log(`Asset inspection passed: targets=${rows.length}, release_approved=${approvedPaths.size}, missing=${missing.length}; ${coverage}`);
  console.log(`Missing targets: ${missing.join(", ")}`);
}

await main();
