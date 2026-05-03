/**
 * Resize Makko-export PNG/JPEG backgrounds into web-ready WEBP under generated/.
 * Source: Sector Scavengers export → Backgrounds/Backgrounds/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(WEBSITE_ROOT, "generated");

const BG_DIR = path.resolve(
  WEBSITE_ROOT,
  "..",
  "Sector-Scavengers-SS-Redo",
  "sector-scavengers-2026-04-30T1144",
  "Sector Scavengers",
  "Backgrounds",
  "Backgrounds",
);

/** @type {{ file: string; out: string; maxW: number }[]} */
const JOBS = [
  { file: "SS-Background-Information-Hub.png", out: "bg-hero", maxW: 2000 },
  { file: "SS-Salvage-Yard-2.png", out: "bg-gallery", maxW: 1800 },
  { file: "SS-Background-Cryo-Chamber-11.png", out: "bg-cryo", maxW: 1800 },
  { file: "SS-Background-Fixed-Bridge-3.png", out: "bg-bridge", maxW: 1800 },
  { file: "SS-Background-Email-Terminal.png", out: "bg-terminal", maxW: 1800 },
  { file: "SS-Backgound-Hull-Breach-21.png", out: "bg-hull", maxW: 1800 },
  /* Strip / bento tiles (slightly smaller for weight) */
  { file: "SS-Background-Airlock-Outside.png", out: "bg-airlock", maxW: 1400 },
  { file: "SS-Background-Fixed-Brig-3.png", out: "bg-brig", maxW: 1400 },
  { file: "SS-Background-Fixed-Mess-Hall-4.png", out: "bg-mess", maxW: 1400 },
  { file: "SS-Background-Comms-Message-3.png", out: "bg-comms", maxW: 1400 },
  /*
   * Hero portrait: sprite extract writes hero-scav.webp when Makko .webp sits
   * next to JSON. Until then, bake this UI screen so the hero <img> never 404s.
   * Running `npm run build:assets` after sheets exist overwrites with the real frame.
   */
  { file: "Character Selection Screen.png", out: "hero-scav", maxW: 560 },
];

async function run() {
  if (!fs.existsSync(BG_DIR)) {
    console.error("Background folder not found:\n  " + BG_DIR);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0;
  let skip = 0;

  for (const job of JOBS) {
    const src = path.join(BG_DIR, job.file);
    if (!fs.existsSync(src)) {
      console.warn("Missing source, skip:", src);
      skip++;
      continue;
    }

    const dest = path.join(OUT_DIR, `${job.out}.webp`);
    try {
      await sharp(src)
        .rotate()
        .resize({
          width: job.maxW,
          height: job.maxW,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 5 })
        .toFile(dest);
      console.log("Wrote", path.relative(WEBSITE_ROOT, dest));
      ok++;
    } catch (e) {
      console.warn("Sharp failed:", job.file, e.message);
      skip++;
    }
  }

  console.log(`Backgrounds: ${ok} written, ${skip} skipped.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
