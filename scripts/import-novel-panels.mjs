/**
 * Import per-panel novel art from the SS-Redo asset folder into
 * media/novel/ch{NN}/panel-{nn}.webp at a web-friendly size and quality.
 *
 * Source naming convention:
 *   SS-Novel-CH{n}-Page-{p}-Panel-{k}.png  (PNG, multi-MB)
 *
 * We map the source files by their numeric order across (page, panel) to
 * the chapter's global panel index (gid) used by the comic generator, so
 * the first 5 incoming files become panel-01..panel-05 of that chapter.
 *
 * Output:
 *   media/novel/ch{NN}/panel-{nn}.webp  (sRGB, max 1600px wide, q=82)
 *
 * Usage:
 *   node scripts/import-novel-panels.mjs --chapter 1
 *   node scripts/import-novel-panels.mjs --chapter 1 --src "C:\\path\\to\\Chapter-1"
 *   node scripts/import-novel-panels.mjs --chapter 1 --limit 5
 *
 * Idempotent: existing outputs are overwritten only when --force is set.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(__dirname, "..");

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { chapter: null, src: null, limit: null, force: false };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--chapter") opts.chapter = parseInt(args[++i], 10);
    else if (a === "--src") opts.src = args[++i];
    else if (a === "--limit") opts.limit = parseInt(args[++i], 10);
    else if (a === "--force") opts.force = true;
  }
  if (!opts.chapter || Number.isNaN(opts.chapter)) {
    throw new Error("Pass --chapter N (integer, e.g. --chapter 1)");
  }
  return opts;
}

function defaultSourceDir(chapter) {
  return path.join(
    "C:",
    "Users",
    "19415",
    "Desktop",
    "Cursor",
    "Sector-Scavengers-SS-Redo",
    "sector-scavengers-2026-04-30T1144",
    "Sector Scavengers",
    "Lore",
    "Novel",
    `Chapter-${chapter}`,
  );
}

function sortKeyFromName(name) {
  // Pull (page, panel) integers from SS-Novel-CH#-Page-#-Panel-#.png
  const m = /Page-(\d+)-Panel-(\d+)\.png$/i.exec(name);
  if (!m) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, name];
  return [parseInt(m[1], 10), parseInt(m[2], 10), name];
}

async function main() {
  const { chapter, src, limit, force } = parseArgs();
  const sourceDir = src || defaultSourceDir(chapter);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source folder not found: ${sourceDir}`);
  }
  const chPad = String(chapter).padStart(2, "0");
  const outDir = path.join(websiteRoot, "media", "novel", `ch${chPad}`);
  fs.mkdirSync(outDir, { recursive: true });

  const sourceFiles = fs
    .readdirSync(sourceDir)
    .filter((f) => /Page-\d+-Panel-\d+\.png$/i.test(f))
    .map((f) => ({ name: f, key: sortKeyFromName(f) }))
    .sort((a, b) => {
      if (a.key[0] !== b.key[0]) return a.key[0] - b.key[0];
      if (a.key[1] !== b.key[1]) return a.key[1] - b.key[1];
      return a.key[2].localeCompare(b.key[2]);
    })
    .map((entry) => entry.name);

  const take = limit ? sourceFiles.slice(0, limit) : sourceFiles;
  if (!take.length) {
    console.log(`No matching source PNGs in ${sourceDir}`);
    return;
  }

  console.log(`Importing ${take.length} panel(s) for Ch ${chapter} from:`);
  console.log(`  ${sourceDir}`);
  console.log(`Output: media/novel/ch${chPad}/`);

  for (let i = 0; i < take.length; i += 1) {
    const srcName = take[i];
    const gid = i + 1;
    const outName = `panel-${String(gid).padStart(2, "0")}.webp`;
    const outPath = path.join(outDir, outName);
    if (fs.existsSync(outPath) && !force) {
      console.log(`  skip ${outName} (exists; pass --force to overwrite)`);
      continue;
    }
    const srcPath = path.join(sourceDir, srcName);
    const info = await sharp(srcPath)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(outPath);
    const kb = Math.round(info.size / 1024);
    console.log(`  wrote ${outName}  ${info.width}x${info.height}  ${kb} KB  (from ${srcName})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
