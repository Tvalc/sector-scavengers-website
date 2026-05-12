/**
 * Copies full Origin Story strip PNGs into media/origin-story/ (resized, PNG only).
 * Uses the same source resolution as bake-lore-origin.mjs (LORE_SRC or Redo …/Lore/Origin Story).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(WEBSITE_ROOT, "media", "origin-story");
const REDO_ROOT = path.resolve(WEBSITE_ROOT, "..", "Sector-Scavengers-SS-Redo");
const REDO_STAMP = "sector-scavengers-2026-04-30T1144";
const REDO_SECTOR_ROOT = path.resolve(REDO_ROOT, REDO_STAMP, "Sector Scavengers");
const EXPORT_BG_DIR = path.join(REDO_SECTOR_ROOT, "Backgrounds", "Backgrounds");
const DROP_DIR = path.join(WEBSITE_ROOT, "lore", "origin-source");

const MAX_W = 2400;

const FILES = [
  "SS-Background-Origin-Story-Panel-1.png",
  "SS-Background-Origin-Story-Panel-2.png",
  "SS-Background-Origin-Panel-3.png",
  "SS-Background-BudgetCryo-Origin-Panel-4.png",
  "SS-Background-Origin-Warehouse-Panel-5.png",
  "SS-Background-Origin-Warehouse-Panel-6.png",
  "SS-Background-Origin-Warehouse-Panel-6b.png",
  "SS-Background-Origin-ShipLoad-Panel-7.png",
  "SS-Background-Origin-ShipLoad-Panel-7b.png",
  "SS-Background-Origin-ShipLoad-Panel-7c.png",
  "SS-Background-Origin-ShipLoad-Panel-7d.png",
  "SS-Background-Origin-Wakeup-Panel-8.png",
  "SS-Background-Origin-ShipLoad-Panel-8b.png",
  "SS-Background-Origin-SalvageRun-Panel-9.png",
  "SS-Background-Origin-SalvageRun-Panel-9b.png",
  "SS-Background-Origin-SalvageRun-Panel-9c.png",
  "SS-Background-Origin-Boarding-Panel-10.png",
  "SS-Background-Origin-Boarding-Panel-10b.png",
  "SS-Background-Origin-Boarding-Panel-10c.png",
  "SS-Website-Explore-Panel.png",
];

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
    entries = fs
      .readdirSync(dir, { withFileTypes: true })
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
        "No Origin Story source folder (need SS-Background-Origin-Story-Panel-1).",
        "Set LORE_SRC, or place export under Sector-Scavengers-SS-Redo/.../Lore/Origin Story",
        "Outputs to: " + OUT_DIR,
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log("Origin story media source:", srcDir);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  let skip = 0;

  for (const destName of FILES) {
    const src = findInputFile(srcDir, destName);
    if (!src) {
      console.warn("Missing (skip):", destName);
      skip++;
      continue;
    }
    const pngOut = path.join(OUT_DIR, destName);
    try {
      const resized = sharp(src).rotate().resize({
        width: MAX_W,
        height: MAX_W,
        fit: "inside",
        withoutEnlargement: true,
      });
      await resized.png({ compressionLevel: 7 }).toFile(pngOut);
      console.log("Wrote", path.relative(WEBSITE_ROOT, pngOut));
      ok++;
    } catch (e) {
      console.warn("Sharp failed:", destName, e.message);
      skip++;
    }
  }

  console.log(`Origin story media: ${ok} file(s) → media/origin-story, ${skip} missing.`);
  if (ok === 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
