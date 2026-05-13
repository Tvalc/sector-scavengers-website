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
 *   node scripts/import-novel-panels.mjs --chapter 1 --map "6=8,7=9"
 *
 * --map lets you remap the source Panel-N number to a specific output gid when
 * the comic's gid numbering drifts from the source filename (e.g. when bubbles
 * are absorbed into earlier panels). Entries are "<sourcePanelN>=<outputGid>",
 * comma separated. Unlisted source files fall back to their natural gid.
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
  const opts = { chapter: null, src: null, limit: null, force: false, map: {} };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--chapter") opts.chapter = parseInt(args[++i], 10);
    else if (a === "--src") opts.src = args[++i];
    else if (a === "--limit") opts.limit = parseInt(args[++i], 10);
    else if (a === "--force") opts.force = true;
    else if (a === "--map") {
      const raw = String(args[++i] || "");
      for (const pair of raw.split(",")) {
        const trimmed = pair.trim();
        if (!trimmed) continue;
        const m = /^(\d+)\s*=\s*(\d+)$/.exec(trimmed);
        if (!m) throw new Error(`--map entry must be "src=gid", got: ${trimmed}`);
        opts.map[parseInt(m[1], 10)] = parseInt(m[2], 10);
      }
    }
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
  const { chapter, src, limit, force, map } = parseArgs();
  const sourceDir = src || defaultSourceDir(chapter);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source folder not found: ${sourceDir}`);
  }
  const chPad = String(chapter).padStart(2, "0");
  const outDir = path.join(websiteRoot, "media", "novel", `ch${chPad}`);
  fs.mkdirSync(outDir, { recursive: true });

  const sourceEntries = fs
    .readdirSync(sourceDir)
    .filter((f) => /Page-\d+-Panel-\d+\.png$/i.test(f))
    .map((f) => ({ name: f, key: sortKeyFromName(f) }))
    .sort((a, b) => {
      if (a.key[0] !== b.key[0]) return a.key[0] - b.key[0];
      if (a.key[1] !== b.key[1]) return a.key[1] - b.key[1];
      return a.key[2].localeCompare(b.key[2]);
    });

  const take = limit ? sourceEntries.slice(0, limit) : sourceEntries;
  if (!take.length) {
    console.log(`No matching source PNGs in ${sourceDir}`);
    return;
  }

  console.log(`Importing ${take.length} panel(s) for Ch ${chapter} from:`);
  console.log(`  ${sourceDir}`);
  console.log(`Output: media/novel/ch${chPad}/`);
  if (Object.keys(map).length) {
    console.log(`Source -> gid map: ${Object.entries(map).map(([k, v]) => `${k}=>${v}`).join(", ")}`);
  }

  for (let i = 0; i < take.length; i += 1) {
    const entry = take[i];
    const srcName = entry.name;
    /* sourceN is the "Panel-N" number in the filename. Natural gid = ordinal in
       the sorted list (i+1). --map overrides the natural mapping per sourceN. */
    const sourceN = entry.key[1];
    const gid = map[sourceN] != null ? map[sourceN] : i + 1;
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
