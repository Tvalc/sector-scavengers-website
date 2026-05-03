/**
 * Copies hero MP4s from the Sector Scavengers redo export into media/website-video/.
 * Edit SOURCE if that folder moves.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEST = path.join(ROOT, "media", "website-video");

const SOURCE = String.raw`C:\Users\19415\Desktop\Cursor\Sector-Scavengers-SS-Redo\sector-scavengers-2026-04-30T1144\Sector Scavengers\Videos`;

const MAP = [
  ["WebsiteHero.mp4", "website-hero.mp4"],
  ["3-19-Trailer-SS.mp4", "3-19-trailer-ss.mp4"],
  ["Characters.mp4", "characters.mp4"],
  ["ShipsShowcaseFinal.mp4", "ships-showcase-final.mp4"],
];

if (!fs.existsSync(SOURCE)) {
  console.error("Missing source folder:\n", SOURCE);
  process.exit(1);
}

fs.mkdirSync(DEST, { recursive: true });
for (const [from, to] of MAP) {
  const src = path.join(SOURCE, from);
  if (!fs.existsSync(src)) {
    console.error("Missing file:", src);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(DEST, to));
  console.log("Copied", from, "->", path.join("media", "website-video", to));
}
console.log("Done.");
