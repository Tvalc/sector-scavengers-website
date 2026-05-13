/**
 * Import per-panel novel art from the SS-Redo asset folder into
 * media/novel/ch{NN}/panel-{nn}.webp at a web-friendly size and quality.
 *
 * Source naming convention:
 *   SS-Novel-CH{n}-Page-{p}-Panel-{k}.png  (PNG, multi-MB)
 *   SS-Novel-CH{n}-Page-{p}-Panel-{k}-left.png  /  ...-right.png  (side-by-side spread)
 *
 * We map the source files by their numeric order across (page, panel, side) to
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
 *   node scripts/import-novel-panels.mjs --chapter 1 --map "5=6,6=8,7=9,8=10"
 *
 * --map remaps source panel numbers to output gids when the comic drifts from
 * filename order (e.g. absorbed bubbles). Entries:
 *   "8=10"       one file for panel 8 -> gid 10; two files (8-left + 8-right) -> 10 then 11
 *   "8-left=10"  explicit side (optional, overrides the pair rule for that file)
 * Comma separated. Unlisted source files fall back to ordinal position (1-based).
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
        const m = /^(\d+)(?:-(left|right))?\s*=\s*(\d+)$/i.exec(trimmed);
        if (!m) throw new Error(`--map entry must be "N=gid" or "N-left=gid", got: ${trimmed}`);
        const key = m[2] ? `${m[1]}-${m[2].toLowerCase()}` : m[1];
        opts.map[key] = parseInt(m[3], 10);
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
  // SS-Novel-CH#-Page-#-Panel-#.png  or  ...-Panel-#-left.png / -right.png
  const m = /Page-(\d+)-Panel-(\d+)(?:-(left|right))?\.png$/i.exec(name);
  if (!m) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 2, name];
  const page = parseInt(m[1], 10);
  const panel = parseInt(m[2], 10);
  const sideOrder = m[3] ? (m[3].toLowerCase() === "left" ? 0 : 1) : 0;
  return [page, panel, sideOrder, name];
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
    .filter((f) => /Page-\d+-Panel-\d+(?:-(left|right))?\.png$/i.test(f))
    .map((f) => {
      const m = /Page-(\d+)-Panel-(\d+)(?:-(left|right))?\.png$/i.exec(f);
      if (!m) return { name: f, key: sortKeyFromName(f), panel: -1, side: null };
      const page = parseInt(m[1], 10);
      const panel = parseInt(m[2], 10);
      const side = m[3] ? m[3].toLowerCase() : null;
      const sideOrder = side === "left" ? 0 : side === "right" ? 1 : 0;
      const key = [page, panel, sideOrder, f];
      return { name: f, key, panel, side };
    })
    .sort((a, b) => {
      if (a.key[0] !== b.key[0]) return a.key[0] - b.key[0];
      if (a.key[1] !== b.key[1]) return a.key[1] - b.key[1];
      if (a.key[2] !== b.key[2]) return a.key[2] - b.key[2];
      return String(a.key[3]).localeCompare(String(b.key[3]));
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

  /** panel number -> count of files already assigned for that panel (for 8=10 -> 10,11) */
  const panelOrdinal = new Map();

  function gidForSource(entry, index) {
    const { panel, side } = entry;
    if (side && map[`${panel}-${side}`] != null) return map[`${panel}-${side}`];
    if (map[String(panel)] != null) {
      const ord = panelOrdinal.get(panel) ?? 0;
      panelOrdinal.set(panel, ord + 1);
      return map[String(panel)] + ord;
    }
    return index + 1;
  }

  for (let i = 0; i < take.length; i += 1) {
    const entry = take[i];
    const srcName = entry.name;
    const gid = gidForSource(entry, i);
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
