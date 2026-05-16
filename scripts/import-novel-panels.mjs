/**
 * Import per-panel novel art from the SS-Redo asset folder into
 * media/novel/ch{NN}/panel-{nn}.webp at a web-friendly size and quality.
 *
 * Source naming convention:
 *   SS-Novel-CH{n}-Page-{p}-Panel-{k}.png  (PNG, multi-MB)
 *   SS-Novel-CH{n}-Page-{p}-Panel-{k}-left.png  /  ...-right.png  (side-by-side spread)
 *   ...-Panel-{k}-bottomleft.png  /  ...-bottomright.png  (second row under the same page panel)
 *   ...-Panel-{k}-topleft.png / ...-topright.png (four-tile page-8 style; hyphen optional: Panel-8topleft.png)
 *   The hyphen between {k} and the side is optional: Panel-10left.png also matches.
 *
 * IMPORTANT: `Page-{p}` is the **page index inside the SS export / art board** (often Page-1
 * for the first board), **not** the website’s “Page 13” scroll header (`#novel-page-13`).
 * `Panel-{k}` is the k-th tile on that board. The site loads **imported** `panel-NN.webp` from
 * `media/novel/chNN/`; if you only update the source PNG and skip import, or an old webp
 * shares the same slot, the comic will not match the PNG you are viewing.
 *
 * We map the source files by their numeric order across (page, panel, side) to
 * the chapter's global panel index (gid) used by the comic generator, so
 * the first 5 incoming files become panel-01..panel-05 of that chapter.
 *
 * Chapter 1 built-in map (SS `Page-1-Panel-*` → comic `novel-p{gid}` / `panel-{gid}.webp`; gids skip
 * merged HUD/code beats): 5→6, 6→8, 7→9, 8 corners→10–13, 9→14, 10 left/right→15–16,
 * 11 left/right→17–18, 12→19, 13→20, 14→21, 15→22.
 * Pass --map to override any key.
 *
 * Output:
 *   media/novel/ch{NN}/panel-{nn}.webp  (sRGB, max 1600px wide, q=82)
 *
 * Usage:
 *   node scripts/import-novel-panels.mjs --chapter 1
 *   node scripts/import-novel-panels.mjs --chapter 1 --src "C:\\path\\to\\Chapter-1"
 *   node scripts/import-novel-panels.mjs --chapter 1 --limit 5
 *   node scripts/import-novel-panels.mjs --chapter 1 --map "5=6,6=8,7=9,8-topleft=10,8-topright=11,8-bottomleft=12,8-bottomright=13,9=14,10-left=15,10-right=16,11-left=17,11-right=18,12=19,13=20,14=21,15=22" --force
 *
 * --map remaps source panel numbers to output gids when the comic drifts from
 * filename order (e.g. absorbed bubbles). Entries:
 *   "8=10"       one file for panel 8 -> gid 10; two files (8-left + 8-right) -> 10 then 11;
 *                add 8-bottomleft + 8-bottomright for a second row under the same comic page (gids 12 and 13)
 *   "8-left=10"  explicit side (optional, overrides the pair rule for that file)
 *   "8-bottomleft=12"  explicit bottom row (same map syntax)
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

/** Built-in SS Panel number -> comic gid when the generator merges/absorbs beats. User --map overrides same keys. */
const BUILTIN_CHAPTER_PANEL_MAP = {
  1: {
    5: 6,
    6: 8,
    7: 9,
    "8-topleft": 10,
    "8-topright": 11,
    "8-bottomleft": 12,
    "8-bottomright": 13,
    9: 14,
    "10-left": 15,
    "10-right": 16,
    "11-left": 17,
    "11-right": 18,
    12: 19,
    13: 20,
    14: 21,
    15: 22,
    /** SS export tile 17 → comic page 17 (`novel-p26` / `panel-26.webp`). */
    17: 26,
  },
};

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
        const m =
          /^(\d+)(?:-(left|right|topleft|topright|bottomleft|bottomright))?\s*=\s*(\d+)$/i.exec(trimmed);
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

function sideOrderFromSuffix(suffix) {
  if (!suffix) return 0;
  const s = suffix.toLowerCase();
  if (s === "topleft") return 0;
  if (s === "topright") return 1;
  if (s === "left") return 0;
  if (s === "right") return 1;
  if (s === "bottomleft") return 2;
  if (s === "bottomright") return 3;
  return 0;
}

/* Side suffix: Panel-8-topleft / Panel-10left / Panel-10-left (hyphen optional before side). */
const PANEL_FILE_RE =
  /Page-(\d+)-Panel-(\d+)(?:-?(topleft|topright|bottomleft|bottomright|left|right))?\.png$/i;

function sortKeyFromName(name) {
  const m = PANEL_FILE_RE.exec(name);
  if (!m) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 99, name];
  const page = parseInt(m[1], 10);
  const panel = parseInt(m[2], 10);
  const sideOrder = sideOrderFromSuffix(m[3]);
  return [page, panel, sideOrder, name];
}

async function main() {
  const { chapter, src, limit, force, map: userMap } = parseArgs();
  const map = { ...userMap };
  const builtin = BUILTIN_CHAPTER_PANEL_MAP[chapter];
  if (builtin) {
    for (const [k, v] of Object.entries(builtin)) {
      if (map[k] === undefined) map[k] = v;
    }
  }
  const sourceDir = src || defaultSourceDir(chapter);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source folder not found: ${sourceDir}`);
  }
  const chPad = String(chapter).padStart(2, "0");
  const outDir = path.join(websiteRoot, "media", "novel", `ch${chPad}`);
  fs.mkdirSync(outDir, { recursive: true });

  const sourceEntries = fs
    .readdirSync(sourceDir)
    .filter((f) => PANEL_FILE_RE.test(f))
    .map((f) => {
      const m = PANEL_FILE_RE.exec(f);
      if (!m) return { name: f, key: sortKeyFromName(f), panel: -1, side: null };
      const page = parseInt(m[1], 10);
      const panel = parseInt(m[2], 10);
      const side = m[3] ? m[3].toLowerCase() : null;
      const sideOrder = sideOrderFromSuffix(side);
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
