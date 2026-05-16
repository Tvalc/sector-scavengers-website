/**
 * Shared novel manuscript path and CLI helpers for generate-novel-*.mjs scripts.
 */
import fs from "node:fs";
import path from "node:path";

/**
 * Prefer `book1/` under the website when it contains BOOK1_CH*.md; otherwise
 * sibling repo `../sector-scavengers/novel`.
 * @param {string} websiteRoot
 * @returns {string}
 */
export function resolveNovelDir(websiteRoot) {
  const book1 = path.join(websiteRoot, "book1");
  try {
    if (fs.existsSync(book1)) {
      const has = fs
        .readdirSync(book1)
        .some((f) => /^BOOK1_CH\d+_/i.test(f) && f.endsWith(".md"));
      if (has) return book1;
    }
  } catch {
    /* ignore */
  }
  return path.resolve(websiteRoot, "..", "sector-scavengers", "novel");
}

/**
 * @param {string[]} argv process.argv
 * @returns {Set<number> | null} null = write all chapters
 */
export function parseChapterFilterFromArgv(argv) {
  const set = new Set();
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if ((a === "--chapter" || a === "-c") && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      if (!Number.isNaN(n)) set.add(n);
    } else if (a === "--chapters" && argv[i + 1]) {
      for (const p of argv[i + 1].split(",")) {
        const n = parseInt(p.trim(), 10);
        if (!Number.isNaN(n)) set.add(n);
      }
      i += 1;
    }
  }
  return set.size ? set : null;
}
