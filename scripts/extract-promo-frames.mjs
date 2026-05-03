/**
 * Reads Makko Sprite Studio JSON + matching .webp (same folder as JSON),
 * extracts frame 0, writes optimized WEBP files to ../generated/.
 *
 * If your export only contained JSON: copy each *.webp referenced in meta.image
 * into the same folder as its JSON from Makko, then run:
 *   npm run build:assets
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(WEBSITE_ROOT, "generated");

const EXPORT_BASE = path.resolve(
  WEBSITE_ROOT,
  "..",
  "Sector-Scavengers-SS-Redo",
  "sector-scavengers-2026-04-30T1144",
  "Sector Scavengers",
);

/** @type {{ relJson: string; outBase: string; maxW: number }[]} */
const JOBS = [
  {
    relJson: path.join(
      "Characters",
      "Space Scav 1 Sprites",
      "space_scav_1_idle_static_hud_default.json",
    ),
    outBase: "hero-scav",
    maxW: 520,
  },
  {
    relJson: path.join(
      "Characters",
      "Derelict_Military_Fighter_Epic Sprites",
      "derelict_military_fighter_epic_idle_default.json",
    ),
    outBase: "derelict-epic",
    maxW: 620,
  },
  {
    relJson: path.join(
      "SS-Tactic-Card-Repair Sprites",
      "ss-tactic-card-repair_active_default.json",
    ),
    outBase: "card-repair",
    maxW: 300,
  },
  {
    relJson: path.join(
      "Shields Icon Sprites",
      "shields_icon_active_default.json",
    ),
    outBase: "shields-icon",
    maxW: 220,
  },
  {
    relJson: path.join(
      "Characters",
      "SS-Space-Salvage-Junker-1 Sprites",
      "ss-space-salvage-junker-1_largestack_default.json",
    ),
    outBase: "junker",
    maxW: 480,
  },
];

function frame0(sheetJson) {
  const keys = Object.keys(sheetJson.frames || {}).sort();
  if (!keys.length) throw new Error("No frames in JSON");
  const first = sheetJson.frames[keys[0]];
  const rect = first?.frame;
  if (!rect) throw new Error("Bad frame data");
  return { left: rect.x, top: rect.y, width: rect.w, height: rect.h };
}

async function run() {
  if (!fs.existsSync(EXPORT_BASE)) {
    console.error("Makko export folder not found at:\n  " + EXPORT_BASE);
    console.error("Edit EXPORT_BASE in scripts/extract-promo-frames.mjs if your path differs.");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0;
  let skip = 0;

  for (const job of JOBS) {
    const jsonPath = path.join(EXPORT_BASE, job.relJson);
    if (!fs.existsSync(jsonPath)) {
      console.warn("Missing JSON, skip:", jsonPath);
      skip++;
      continue;
    }

    let sheetJson;
    try {
      sheetJson = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch (e) {
      console.warn("Bad JSON, skip:", jsonPath, e.message);
      skip++;
      continue;
    }

    const imageFile = sheetJson.meta?.image;
    if (!imageFile) {
      console.warn("No meta.image, skip:", jsonPath);
      skip++;
      continue;
    }

    const webpPath = path.join(path.dirname(jsonPath), imageFile);
    if (!fs.existsSync(webpPath)) {
      console.warn(
        "Missing spritesheet WEBP next to JSON (copy from Makko export):\n  " + webpPath,
      );
      skip++;
      continue;
    }

    const ext = frame0(sheetJson);
    const dest = path.join(OUT_DIR, `${job.outBase}.webp`);

    try {
      let pipeline = sharp(webpPath).extract(ext);
      if (job.maxW && ext.width > job.maxW) {
        pipeline = pipeline.resize({
          width: job.maxW,
          height: Math.round(ext.height * (job.maxW / ext.width)),
          fit: "fill",
        });
      }
      await pipeline.webp({ quality: 88, alphaQuality: 100 }).toFile(dest);
      console.log("Wrote", path.relative(WEBSITE_ROOT, dest));
      ok++;
    } catch (e) {
      console.warn("Sharp failed for", job.outBase, e.message);
      skip++;
    }
  }

  console.log(`Done. ${ok} written, ${skip} skipped.`);
  if (skip && !ok) {
    console.log(
      "\nTip: Re-export from Makko with spritesheets included, or copy each meta.image .webp\n" +
        "into the same folder as its JSON, then run npm run build:assets again.",
    );
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
