/**
 * Copies strip art from your "Origin Story" export folder into lore/origin/
 * as both PNG and WebP (site prefers WebP, PNG fallback).
 *
 * Source resolution (first folder that contains Story Panel 1 wins), unless LORE_SRC is set:
 *   1) env LORE_SRC (highest priority)
 *   2) ../Sector-Scavengers-SS-Redo/<any stamp>/Sector Scavengers/Lore/Origin Story
 *      (e.g. .../sector-scavengers-2026-04-30T1144/Sector Scavengers/Lore/Origin Story)
 *   3) ../sector-scavengers/assets/PNG/Sector Scavengers/Lore/Origin Story
 *   4) ../sector-scavengers/Sector Scavengers/Lore/Origin Story
 *   5) ../Sector Scavengers/Lore/Origin Story
 *   6) ../sector-scavengers/Lore/Origin Story
 *   7) Makko redo export Backgrounds/Backgrounds (same stamp folder as above)
 *   8) lore/origin-source/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE_ROOT = path.resolve(__dirname, "..");
const LORE_OUT = path.join(WEBSITE_ROOT, "lore", "origin");

const REDO_ROOT = path.resolve(WEBSITE_ROOT, "..", "Sector-Scavengers-SS-Redo");
const REDO_STAMP = "sector-scavengers-2026-04-30T1144";
const REDO_SECTOR_ROOT = path.resolve(REDO_ROOT, REDO_STAMP, "Sector Scavengers");
const EXPORT_BG_DIR = path.join(REDO_SECTOR_ROOT, "Backgrounds", "Backgrounds");

const DROP_DIR = path.join(WEBSITE_ROOT, "lore", "origin-source");

/** Any `Sector-Scavengers-SS-Redo/<stamp>/Sector Scavengers/Lore/Origin Story` (newest stamp name first). */
function discoverRedoOriginStoryDirs() {
  const dirs = [];
  const seen = new Set();
  function add(p) {
    const r = path.resolve(p);
    if (seen.has(r)) return;
    seen.add(r);
    if (fs.existsSync(r) && fs.statSync(r).isDirectory()) dirs.push(r);
  }
  if (!fs.existsSync(REDO_ROOT) || !fs.statSync(REDO_ROOT).isDirectory()) return dirs;
  let stamps = [];
  try {
    stamps = fs
      .readdirSync(REDO_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .reverse();
  } catch {
    return dirs;
  }
  for (const stamp of stamps) {
    add(path.join(REDO_ROOT, stamp, "Sector Scavengers", "Lore", "Origin Story"));
  }
  return dirs;
}

/** Output basenames (must match index.html). */
const LORE_DEST_PNG = [
  "SS-Background-Origin-Story-Panel-1.png",
  "SS-Background-Origin-Warehouse-Panel-6b.png",
  "SS-Background-Origin-ShipLoad-Panel-8b.png",
  "PlayArea.png",
  "SS-Website-Explore-Panel.png",
  "SS-Background-Website-Panel-Smuggle.png",
];

const MAX_W = 2200;

function candidateDirs() {
  const list = [
    ...discoverRedoOriginStoryDirs(),
    path.join(WEBSITE_ROOT, "..", "sector-scavengers", "assets", "PNG", "Sector Scavengers", "Lore", "Origin Story"),
    path.join(WEBSITE_ROOT, "..", "sector-scavengers", "Sector Scavengers", "Lore", "Origin Story"),
    path.join(WEBSITE_ROOT, "..", "Sector Scavengers", "Lore", "Origin Story"),
    path.join(WEBSITE_ROOT, "..", "sector-scavengers", "Lore", "Origin Story"),
    EXPORT_BG_DIR,
    DROP_DIR,
  ];
  if (process.env.LORE_SRC && String(process.env.LORE_SRC).trim()) {
    list.unshift(path.resolve(String(process.env.LORE_SRC).trim()));
  }
  return list;
}

/** Match Explorer names with or without extension; case-insensitive stem. */
function findInputFile(dir, destPngName) {
  const stem = destPngName.replace(/\.png$/i, "");
  const tryExact = [
    path.join(dir, destPngName),
    path.join(dir, stem + ".PNG"),
    path.join(dir, stem + ".png"),
    path.join(dir, stem + ".webp"),
    path.join(dir, stem),
  ];
  for (const p of tryExact) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch {
    return null;
  }
  const lower = stem.toLowerCase();
  for (const f of entries) {
    const s = f.replace(/\.(png|jpg|jpeg|webp)$/i, "");
    if (s.toLowerCase() === lower) return path.join(dir, f);
  }
  return null;
}

function pickSourceDir() {
  for (const d of candidateDirs()) {
    if (!d || !fs.existsSync(d) || !fs.statSync(d).isDirectory()) continue;
    if (findInputFile(d, "SS-Background-Origin-Story-Panel-1.png")) return d;
  }
  return null;
}

async function run() {
  const srcDir = pickSourceDir();
  if (!srcDir) {
    console.error(
      [
        "No lore strip source folder found (need at least SS-Background-Origin-Story-Panel-1).",
        "Set LORE_SRC to your folder, e.g.:",
        '  PowerShell:  $env:LORE_SRC="C:\\...\\Sector Scavengers\\Lore\\Origin Story"; npm run build:lore',
        "",
        "Or copy PNGs into: " + DROP_DIR,
        "",
        "Outputs to: " + LORE_OUT + "  (.png + .webp for each file below)",
        ...LORE_DEST_PNG.map((f) => "    " + f),
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log("Lore strip source:", srcDir);
  if (!fs.existsSync(LORE_OUT)) fs.mkdirSync(LORE_OUT, { recursive: true });

  let ok = 0;
  let skip = 0;

  for (const destName of LORE_DEST_PNG) {
    const src = findInputFile(srcDir, destName);
    if (!src) {
      console.warn("Missing (skip):", destName);
      skip++;
      continue;
    }
    const pngOut = path.join(LORE_OUT, destName);
    const webpOut = pngOut.replace(/\.png$/i, ".webp");
    try {
      const resized = sharp(src).rotate().resize({
        width: MAX_W,
        height: MAX_W,
        fit: "inside",
        withoutEnlargement: true,
      });
      await resized.png({ compressionLevel: 7 }).toFile(pngOut);
      await sharp(pngOut).webp({ quality: 86, effort: 5 }).toFile(webpOut);
      console.log("Wrote", path.relative(WEBSITE_ROOT, pngOut), "+", path.basename(webpOut));
      ok++;
    } catch (e) {
      console.warn("Sharp failed:", destName, e.message);
      skip++;
    }
  }

  console.log(`Lore strip: ${ok} panel(s) → lore/origin (png+webp), ${skip} missing.`);
  if (ok === 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
