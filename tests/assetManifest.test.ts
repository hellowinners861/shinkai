import manifestCsv from "../assets/manifest.csv?raw";
import { APPROVED_SPECIES_ASSETS } from "../src/data/speciesAssets";
import { describe, expect, it } from "vitest";

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"' && field.length === 0) quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\r" || character === "\n") {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field); field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += character;
  }
  const header = rows.shift();
  if (!header) throw new Error("manifest has no header");
  return rows.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

const rows = parseCsv(manifestCsv);

describe("species asset manifest", () => {
  it("covers the 100-species release target without pretending missing assets are approved", () => {
    expect(rows).toHaveLength(100);
    expect(new Set(rows.map((row) => row.source_catalog_id)).size).toBe(100);
    expect(rows.filter((row) => row.usage_status === "release_approved").length).toBeGreaterThan(0);
    for (const row of rows.filter((entry) => entry.usage_status !== "release_approved")) {
      expect(row.local_path).toBe("");
      expect(row.sha256).toBe("");
      expect(row.asset_id).toBe("");
    }
  });

  it("allows runtime use only for local, attributed, permissively licensed files", () => {
    const approved = rows.filter((row) => row.usage_status === "release_approved");
    for (const row of approved) {
      expect(row.local_path).toMatch(/^assets\/species\//u);
      expect(row.local_path).not.toMatch(/^https?:/u);
      expect(row.source_page_url).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/u);
      expect(row.original_file_url).toMatch(/^https:\/\/upload\.wikimedia\.org\//u);
      expect(row.license_id).toMatch(/^(Public domain|CC0(?: 1\.0)?|CC BY(?:-SA)?(?: \d+(?:\.\d+)?)?)$/u);
      expect(row.license_id).not.toMatch(/\b(?:NC|ND)\b/u);
      expect((row.creator ?? "").length).toBeGreaterThan(0);
      expect((row.attribution_text ?? "").length).toBeGreaterThan(0);
      expect(row.sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(row.commercial_use_allowed).toBe("true");
      expect(row.derivatives_allowed).toBe("true");
      expect(row.redistribution_allowed).toBe("true");
    }
  });

  it("keeps the four catalog photo credits joined by source_catalog_id", () => {
    const approvedRows = rows.filter((row) => row.usage_status === "release_approved");
    const rowsByCatalogId = new Map(
      approvedRows.map((row) => [row.source_catalog_id, row]),
    );

    expect(APPROVED_SPECIES_ASSETS).toHaveLength(approvedRows.length);
    expect(new Set(APPROVED_SPECIES_ASSETS.map((asset) => asset.sourceCatalogId))).toEqual(
      new Set(approvedRows.map((row) => row.source_catalog_id)),
    );
    for (const asset of APPROVED_SPECIES_ASSETS) {
      const row = rowsByCatalogId.get(asset.sourceCatalogId);
      expect(row).toBeDefined();
      expect({
        sourcePageUrl: asset.sourcePageUrl,
        creator: asset.creator,
        licenseId: asset.licenseId,
        licenseUrl: asset.licenseUrl,
      }).toEqual({
        sourcePageUrl: row?.source_page_url,
        creator: row?.creator,
        licenseId: row?.license_id,
        licenseUrl: row?.license_url,
      });
    }
  });
});
