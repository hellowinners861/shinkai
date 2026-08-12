import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CATALOG_PATH = resolve(ROOT, "docs/SPECIES_CATALOG.csv");
const ASSET_DIR = resolve(ROOT, "assets/species");
const MANIFEST_PATH = resolve(ROOT, "assets/manifest.csv");
const AUDIT_DATE = new Date().toISOString().slice(0, 10);
const USER_AGENT = "SHINKAI-asset-audit/1.0 (local game asset audit)";

const TARGET_LIMITS = {
  fish: 20,
  gelatinous_plankton: 16,
  squid: 16,
  octopus: 16,
  crab: 16,
  shrimp: 16,
};
const MAX_ASSET_BYTES = 200 * 1024;

// These are the only files this acquisition run is allowed to release. The two
// metadata entries are intentionally explicit: the accepted scientific name is
// present in the Commons ImageDescription/category metadata, while the file
// title is a historical or common-name title.
const APPROVED_FILES = {
  F001: { title: "File:Eurypharynx pelecanoides.jpg", basis: "title" },
  F007: { title: "File:Chiasmodon niger.jpg", basis: "title" },
  F008: { title: "File:Alepisaurus ferox9180.jpg", basis: "title" },
  F010: { title: "File:Bathysaurus mollis.jpg", basis: "title" },
  /* Future candidates remain intentionally disabled until a later review.
  F011: { title: "File:Evermannella balbo.jpg", basis: "title" },
  F012: { title: "File:Bathypterois grallator.jpg", basis: "title" },
  F013: { title: "File:Anoplogaster cornuta.jpg", basis: "title" },
  F014: { title: "File:Chauliodus sloani.jpg", basis: "title" },
  F017: { title: "File:Borostomias antarcticus.jpg", basis: "title" },
  F019: { title: "File:Cyclothone microdon.jpg", basis: "title" },
  F020: { title: "File:Cyclothone pallida.jpg", basis: "title" },

  I001: { title: "File:Atolla wyvillei.jpg", basis: "title" },
  I006: { title: "File:Bathykorus bouilloni.jpg", basis: "title" },
  I007: { title: "File:Crossota millsae.jpg", basis: "title" },
  I008: { title: "File:Halitrephes Maasi.jpg", basis: "title" },
  I009: { title: "File:Colobonema sericeum.jpg", basis: "title" },
  I010: { title: "File:Bathocyroe fosteri.jpg", basis: "title" },

  I021: {
    title: "File:Architeuthis dux-Zoologisches-Museum(Kiel)-2026-02-msu--2745.jpg",
    basis: "title",
  },
  I025: { title: "File:Histioteuthis reversa.jpg", basis: "title" },
  I027: { title: "File:Gladius Taningia danae.jpg", basis: "title" },
  I028: { title: "File:Bec squid.jpg", basis: "description" },
  I029: { title: "File:Galiteuthis phyllura.jpg", basis: "title" },
  I030: { title: "File:Gonatus onyx.jpg", basis: "title" },
  I031: { title: "File:Chiroteuthis calyx par.png", basis: "title" },
  I032: { title: "File:Bathyteuthis abyssicola.jpg", basis: "title" },
  I033: { title: "File:Joubiniteuthis portieri.jpg", basis: "title" },
  I034: { title: "File:Mastigoteuthis flammea.jpg", basis: "title" },
  I035: { title: "File:Octopoteuthis deletron.jpg", basis: "title" },
  I036: { title: "File:Ancistrocheirus lesueurii.jpg", basis: "title" },

  I037: { title: "File:Graneledone boreopacifica.jpg", basis: "title" },
  I038: { title: "File:Baby Octopus - Graneledone verrucosa.jpg", basis: "title" },
  I039: { title: "File:Grimpoteuthis bathynectes.jpg", basis: "title" },
  I041: { title: "File:Grimpoteuthis discoveryi.jpg", basis: "title" },
  I042: { title: "File:Cirroteuthis muelleri.jpeg", basis: "title" },
  I043: { title: "File:Cirrothauma Murrayi octopus vintage poster.jpg", basis: "title" },
  I044: { title: "File:Opisthoteuthis agassizii.jpg", basis: "title" },
  I045: { title: "File:Stauroteuthis syrtensis.jpg", basis: "title" },
  I046: { title: "File:Vulcanoctopus hydrothermalis.jpg", basis: "title" },
  I049: { title: "File:Japetella diaphana.jpg", basis: "title" },
  I050: {
    title: "File:Céphalopode (Vitreledonella richardi) (Ifremer 00812-92374).jpg",
    basis: "title",
  },

  I053: { title: "File:Neolithodes diomedeae dorsal MA I526478.jpg", basis: "title" },
  I054: {
    title: "File:EB1911 Malacostraca - Fig. 1.—Neolithodes grimaldii.jpg",
    basis: "title",
  },
  I058: { title: "File:Chaceon affinis.jpg", basis: "title" },
  I059: { title: "File:Geryon trispinosus.jpg", basis: "title" },
  I063: {
    title: "File:Kiwa tyleri (10.1371-journal.pone.0127621) Figure 2.tiff",
    basis: "title",
  },
  I064: { title: "File:Kiwa hirsuta.jpg", basis: "title" },

  I069: {
    title: "File:Biologie de la crevette Rimicaris exoculata (Ifremer 00702-81445 - 34571).jpg",
    basis: "title",
  },
  I075: { title: "File:Plesionika martia (MNHN-IU-2013-2599).jpeg", basis: "title" },
  I078: {
    title: "File:FMIB 35227 Nematocarcinus ensiferus Smith Lateral View of female, from Station 2035.jpeg",
    basis: "description",
  },
  I080: { title: "File:Rimicaris chacei (MNHN-IU-2014-20654).jpeg", basis: "title" },
  I083: { title: "File:Pasiphaea multidentata.jpg", basis: "title" },
  */
};

const MANIFEST_HEADERS = [
  "asset_id",
  "source_catalog_id",
  "accepted_scientific_name",
  "category",
  "asset_role",
  "local_path",
  "source_page_url",
  "original_file_url",
  "title",
  "creator",
  "license_id",
  "license_url",
  "attribution_text",
  "modifications",
  "commercial_use_allowed",
  "derivatives_allowed",
  "redistribution_allowed",
  "usage_status",
  "downloaded_at",
  "sha256",
  "reviewed_by",
  "reviewed_at",
  "notes",
];

function parseCsv(text) {
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
  const [header, ...data] = rows;
  if (!header) throw new Error("CSV has no header");
  return data.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/gu, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/gu, " ")
    .trim();
}

function hasExactTaxon(text, name) {
  const haystack = String(text ?? "");
  let start = 0;
  while (true) {
    const index = haystack.toLocaleLowerCase("en-US").indexOf(name.toLocaleLowerCase("en-US"), start);
    if (index < 0) return false;
    const before = index === 0 || !/[\p{L}]/u.test(haystack[index - 1]);
    const end = index + name.length;
    // Commons file names can append a serial number directly to a taxon name.
    // A following letter still rejects a different taxon such as ensiferus.
    const after = end >= haystack.length || !/[\p{L}]/u.test(haystack[end]);
    if (before && after) return true;
    start = end;
  }
}

function normalizeTitle(value) {
  return String(value ?? "").replace(/^File:/u, "").replaceAll("_", " ").trim().toLocaleLowerCase("en-US");
}

function allowedLicense(value) {
  return ALLOWED_LICENSE_IDS.has(stripHtml(value));
}

function cleanUrl(value) {
  return String(value ?? "").split("?")[0];
}

function extensionFromUrl(url) {
  const path = new URL(url).pathname;
  const extension = extname(path).toLocaleLowerCase("en-US");
  return extension === ".jpeg" ? ".jpeg" : extension || ".jpg";
}

function targetRows(catalogRows) {
  return Object.entries(TARGET_LIMITS).flatMap(([category, limit]) =>
    catalogRows.filter((row) => row.category === category).slice(0, limit),
  );
}

async function commonsFileInfo(titles) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "384",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`Commons API request failed: ${response.status}`);
  const payload = await response.json();
  return new Map((payload.query?.pages ?? []).map((page) => [normalizeTitle(page.title), page]));
}

async function assertPageIsReachable(url) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Source page is not reachable (${response.status}): ${url}`);
  await response.body?.cancel();
}

async function downloadThumbnail(url, destination) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Thumbnail download failed (${response.status}): ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error(`Thumbnail is empty: ${url}`);
      await writeFile(destination, bytes);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
      return bytes;
}

function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function emptyManifestRow(target, notes) {
  return {
    asset_id: "",
    source_catalog_id: target.source_catalog_id,
    accepted_scientific_name: target.accepted_scientific_name,
    category: target.category,
    asset_role: "species_portrait",
    local_path: "",
    source_page_url: "",
    original_file_url: "",
    title: "",
    creator: "",
    license_id: "",
    license_url: "",
    attribution_text: "",
    modifications: "",
    commercial_use_allowed: "false",
    derivatives_allowed: "false",
    redistribution_allowed: "false",
    usage_status: "reference_only",
    downloaded_at: "",
    sha256: "",
    reviewed_by: "Codex",
    reviewed_at: AUDIT_DATE,
    notes,
  };
}

async function makeApprovedRow(target, selected, page) {
  if (!page?.imageinfo?.[0]) throw new Error(`No imageinfo for ${selected.title}`);
  const info = page.imageinfo[0];
  const licenseId = stripHtml(info.extmetadata?.LicenseShortName?.value);
  if (!allowedLicense(licenseId)) throw new Error(`Disallowed or ambiguous license for ${selected.title}: ${licenseId}`);
  const sourcePageUrl = cleanUrl(info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`);
  const originalFileUrl = cleanUrl(info.url);
  if (!sourcePageUrl.startsWith("https:") || !originalFileUrl.startsWith("https:")) {
    throw new Error(`Non-HTTPS source for ${selected.title}`);
  }
  const description = stripHtml(info.extmetadata?.ImageDescription?.value);
  const categories = stripHtml(info.extmetadata?.Categories?.value);
  const evidence = `${page.title} ${description} ${categories}`;
  if (selected.basis === "title" && !hasExactTaxon(normalizeTitle(page.title), target.accepted_scientific_name)) {
    throw new Error(`Title does not identify target taxon: ${target.accepted_scientific_name} / ${page.title}`);
  }
  if (selected.basis === "description" && !hasExactTaxon(evidence, target.accepted_scientific_name)) {
    throw new Error(`Metadata does not identify target taxon: ${target.accepted_scientific_name} / ${page.title}`);
  }
  await assertPageIsReachable(sourcePageUrl);
  const extension = extensionFromUrl(info.thumburl ?? originalFileUrl);
  const filename = `${target.slug}${extension}`;
  const absolutePath = resolve(ASSET_DIR, filename);
  const bytes = await downloadThumbnail(info.thumburl ?? originalFileUrl, absolutePath);
  const creator = stripHtml(info.extmetadata?.Artist?.value) || "Unknown author";
  const licenseUrl = stripHtml(info.extmetadata?.LicenseUrl?.value) || "https://creativecommons.org/publicdomain/mark/1.0/";
  const modifications = `Downloaded Commons API thumbnail (max width ${info.thumbwidth ?? 512}px); no content edits; original file URL retained.`;
  const attribution = `${creator}; ${licenseId}; source: ${sourcePageUrl}`;
  const notes = [
    `taxon_match_basis=${selected.basis}`,
    `api_license_short_name=${licenseId}`,
    `api_mime=${info.mime}`,
    `source_page_http=200`,
    `local_derivative_sha256=${hashBytes(bytes)}`,
    selected.basis === "description" ? "file title uses a historical/common-name form; exact target is stated in Commons metadata" : "exact target appears in the Commons file title",
  ].join(" | ");
  const permitsAttribution = /^(public domain|cc0)/iu.test(licenseId) ? "optional" : "required";
  return {
    asset_id: `commons-${target.source_catalog_id.toLocaleLowerCase("en-US")}`,
    source_catalog_id: target.source_catalog_id,
    accepted_scientific_name: target.accepted_scientific_name,
    category: target.category,
    asset_role: "species_portrait",
    local_path: `assets/species/${filename}`,
    source_page_url: sourcePageUrl,
    original_file_url: originalFileUrl,
    title: page.title,
    creator,
    license_id: licenseId,
    license_url: licenseUrl,
    attribution_text: `${attribution} (attribution ${permitsAttribution})`,
    modifications,
    commercial_use_allowed: "true",
    derivatives_allowed: "true",
    redistribution_allowed: "true",
    usage_status: "release_approved",
    downloaded_at: AUDIT_DATE,
    sha256: hashBytes(bytes),
    reviewed_by: "Codex",
    reviewed_at: AUDIT_DATE,
    notes,
  };
}

async function main() {
  await mkdir(ASSET_DIR, { recursive: true });
  const catalogRows = parseCsv(await readFile(CATALOG_PATH, "utf8"));
  const targets = targetRows(catalogRows);
  const selectedTargets = targets.filter((target) => APPROVED_FILES[target.source_catalog_id]);
  const titles = selectedTargets.map((target) => APPROVED_FILES[target.source_catalog_id].title);
  const pages = new Map();
  for (let offset = 0; offset < titles.length; offset += 50) {
    const batch = await commonsFileInfo(titles.slice(offset, offset + 50));
    batch.forEach((page, key) => pages.set(key, page));
  }
  const manifestRows = [];
  for (const target of targets) {
    const selected = APPROVED_FILES[target.source_catalog_id];
    if (!selected) {
      manifestRows.push(emptyManifestRow(target, "No exact, unambiguous allowed-license candidate was release-approved in this audit; no local file downloaded."));
      continue;
    }
    const page = pages.get(normalizeTitle(selected.title));
    if (!page) throw new Error(`Commons file page not found: ${selected.title}`);
    manifestRows.push(await makeApprovedRow(target, selected, page));
  }
  const csv = [
    MANIFEST_HEADERS.join(","),
    ...manifestRows.map((row) => MANIFEST_HEADERS.map((header) => csvEscape(row[header])).join(",")),
    "",
  ].join("\r\n");
  await mkdir(dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, csv, "utf8");
  const approved = manifestRows.filter((row) => row.usage_status === "release_approved");
  console.log(`Wrote ${manifestRows.length} manifest rows; release_approved=${approved.length}; reference_only=${manifestRows.length - approved.length}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

export { APPROVED_FILES, MANIFEST_HEADERS, parseCsv, targetRows };
