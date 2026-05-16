/**
 * Reads BOOK1_CH*.md (prefer website `book1/`, else ../sector-scavengers/novel)
 * and writes lore/novel/chNN.html + index.html.
 * Run: node scripts/generate-novel-lore-pages.mjs [--chapter N | --chapters 1,2]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildPanelArtPrompt } from "./novel-panel-art-prompt.mjs";
import { resolveNovelDir, parseChapterFilterFromArgv } from "./novel-source.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(__dirname, "..");
const novelDir = resolveNovelDir(websiteRoot);
const outDir = path.join(websiteRoot, "lore", "novel");

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function humanizeSlug(part) {
  return part
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** Markdown after `## Chapter n:` (canonical manuscript body). */
function extractChapterBody(fullText, chapterN) {
  const lines = fullText.replace(/\r\n/g, "\n").split("\n");
  const headerRe = new RegExp(`^## Chapter ${chapterN}:\\s*.+$`);
  for (let i = 0; i < lines.length; i++) {
    if (headerRe.test(lines[i])) {
      let start = i + 1;
      while (start < lines.length && lines[start].trim() === "") start += 1;
      return lines.slice(start).join("\n").trim();
    }
  }
  return fullText.trim();
}

function inlineMdToHtml(raw) {
  const chunks = [];
  let x = raw;
  x = x.replace(/`([^`]+)`/g, (_, c) => {
    const id = `\uE000${chunks.length}\uE001`;
    chunks.push(`<code class="novel-inline-code">${esc(c)}</code>`);
    return id;
  });
  x = x.replace(/\*\*([^*]+)\*\*/g, (_, c) => {
    const id = `\uE000${chunks.length}\uE001`;
    chunks.push(`<strong>${esc(c)}</strong>`);
    return id;
  });
  x = x.replace(/\*([^*]+)\*/g, (_, c) => {
    const id = `\uE000${chunks.length}\uE001`;
    chunks.push(`<em>${esc(c)}</em>`);
    return id;
  });
  x = esc(x);
  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    x = x.replace(`\uE000${i}\uE001`, chunks[i]);
  }
  return x;
}

function stripArtDirectives(p) {
  return p.replace(/<!--\s*art:[\s\S]*?-->\s*\n?/gi, "").trim();
}

function proseMarkdownToHtml(segment) {
  const t = segment.trim();
  if (!t) return "";
  const paras = t.split(/\n\n+/);
  const out = [];
  for (const rawP of paras) {
    const p = stripArtDirectives(rawP).trim();
    if (!p) continue;
    if (/^-{3,}\s*$/.test(p)) {
      out.push('<hr class="novel-chapter__rule" />');
      continue;
    }
    const inner = p
      .split("\n")
      .map((ln) => inlineMdToHtml(ln.trimEnd()))
      .join("<br>\n");
    out.push(`<p>${inner}</p>`);
  }
  return out.join("\n");
}

/** Novel subset: paragraphs, line breaks, **bold**, *italic*, `code`, ``` fences ```. */
function novelMarkdownToHtml(md) {
  const s = md.replace(/\r\n/g, "\n");
  if (!s.trim()) return "";
  const segments = [];
  let i = 0;
  while (i < s.length) {
    const start = s.indexOf("```", i);
    if (start === -1) {
      segments.push({ type: "md", content: s.slice(i) });
      break;
    }
    if (start > i) segments.push({ type: "md", content: s.slice(i, start) });
    const close = s.indexOf("```", start + 3);
    if (close === -1) {
      segments.push({ type: "code", content: s.slice(start + 3).replace(/^\n/, "") });
      break;
    }
    const inner = s
      .slice(start + 3, close)
      .replace(/^\n/, "")
      .replace(/\n$/, "");
    segments.push({ type: "code", content: inner });
    i = close + 3;
  }
  return segments
    .map((seg) =>
      seg.type === "code"
        ? `<pre class="novel-chapter__pre"><code>${esc(seg.content)}</code></pre>`
        : proseMarkdownToHtml(seg.content),
    )
    .filter(Boolean)
    .join("\n");
}

function parseChapter(file) {
  const m = /^BOOK1_CH(\d+)_(.+)\.md$/i.exec(file);
  if (!m) return null;
  const num = m[1];
  const n = parseInt(num, 10);
  const rawSlug = m[2];
  const fileStem = file.replace(/\.md$/i, "");
  const body = fs.readFileSync(path.join(novelDir, file), "utf8").replace(/\r\n/g, "\n");
  const titleMatch = new RegExp(`^## Chapter ${n}:\\s*(.+)$`, "m").exec(body);
  const title = titleMatch ? titleMatch[1].trim() : humanizeSlug(rawSlug);
  const blocks = body.split(/\n\n+/);
  let teaser = "";
  for (const b of blocks) {
    let t = b.trim();
    if (!t || t.startsWith("```") || t.startsWith("---")) continue;
    if (/^#{1,6}\s/.test(t)) {
      t = t.replace(/^#{1,6}[^\n]*\n*/, "").trim();
    }
    if (!t || /^#{1,6}\s/.test(t)) continue;
    teaser = t.replace(/\s+/g, " ").trim();
    break;
  }
  if (teaser.length > 320) teaser = teaser.slice(0, 317) + "…";
  const bodyMd = extractChapterBody(body, n);
  const bodyHtml = novelMarkdownToHtml(bodyMd);
  return { num, n, title, teaser: esc(teaser), file, fileStem, bodyMd, bodyHtml };
}

/**
 * Comic page layout: heavy single-panel (splash) beats so it doesn't read as endless 2–3 tiers.
 * Even page index → one full-width panel; odd → rotating multi-panel strip.
 */
function layoutSpansForPage(ch, pageIndex) {
  /* Ch. 1 cold open: splash mid-scream, then splash for the scream-interior beat before tier strips resume. */
  if (ch.n === 1 && pageIndex === 1) return ["12"];
  /* Ch. 1: full-width BOOTSTRAP readout. Real art carries the code text in-image
     and absorbs the next prose beat ("His mouth tasted like copper...") as the
     panel's caption bubble. */
  if (ch.n === 1 && pageIndex === 3) return ["12"];
  /* Ch. 1: "He sat up too fast..." gets a single full-width panel.
     The "Max slapped at the air..." beat is absorbed into the prior
     [SYSTEM] greeting bubble, so this page now carries one cell. */
  if (ch.n === 1 && pageIndex === 5) return ["12"];
  /* Ch. 1 Page 10: narrow "Somewhere in the wall..." on the left, wide
     robot-helper beat on the right. Marked fixed so the rebalancer doesn't
     collapse it back to 6/6. */
  if (ch.n === 1 && pageIndex === 9) return { spans: ["4", "8"], fixed: true };
  /* Ch. 1 page 11: blood-line in a wide left panel, nervous-laugh beat in a
     narrow taller right panel. Mirror of the page-10 split. Fixed so the
     rebalancer doesn't collapse the 8/4. */
  if (ch.n === 1 && pageIndex === 10) return { spans: ["8", "4"], fixed: true };
  /* Ch. 1 page 12: single splash after the 8+4 laugh beat. STABILITY fence is
     merged into the "Max wiped his face…" prose unit in the queue. */
  if (ch.n === 1 && pageIndex === 11) return { spans: ["12"], fixed: true };
  /* Ch. 1 page 13: single splash — helper bot + EV suit + V.A.L.U. welcome (balloon) +
     narration caption (see mergeValuOrientationSplash). Comic id novel-p20; SS Panel 13
     imports to panel-20.webp automatically (import-novel-panels built-in map). */
  if (ch.n === 1 && pageIndex === 12) return { spans: ["12"], fixed: true };
  /* Ch. 1 page 14: "Where am I?" + orientation reply — one wide panel, dual bubbles over art (mergeWhereAmIOrientationReply). */
  if (ch.n === 1 && pageIndex === 13) return { spans: ["12"], fixed: true };
  /* Ch. 1 page 16: pulse beat + CORE ATTRIBUTES readout as two equal half-page
     panels. Prose "The blue UI erupted." merges into the code beat (caption only
     in HTML; readout is painted on the plate). Comic gid stays 25 for the right
     panel so existing panel-25.webp imports still line up (see mergeBlueUiIntoCoreAttributesReadout). */
  if (ch.n === 1 && pageIndex === 15) return { spans: ["6", "6"], fixed: true };
  if (pageIndex % 2 === 0) return ["12"];
  const multi = [
    ["6", "6", "12"],
    ["12", "6", "6"],
    ["4", "4", "4"],
    ["6", "6", "6", "6"],
    ["12", "4", "4", "4"],
  ];
  return multi[(ch.n + pageIndex) % multi.length];
}

/** Normalize layoutSpansForPage return value to { spans, fixed }. */
function normalizeLayout(layout) {
  if (Array.isArray(layout)) return { spans: layout, fixed: false };
  return { spans: layout.spans, fixed: Boolean(layout.fixed) };
}

function markdownToPlainSpan(md) {
  return md
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip one layer of wrapping straight or curly quotes for dialogue display. */
function stripBalancedOuterQuotes(s) {
  let t = String(s || "").trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).trim();
  if (t.length >= 2 && t.startsWith("\u201c") && t.endsWith("\u201d")) return t.slice(1, -1).trim();
  return t;
}

function chapterUnitsFromMd(md) {
  const s = md.replace(/\r\n/g, "\n").trim();
  if (!s) return [];
  const units = [];
  let i = 0;
  while (i < s.length) {
    const st = s.indexOf("```", i);
    if (st === -1) {
      pushProseUnits(s.slice(i), units);
      break;
    }
    if (st > i) pushProseUnits(s.slice(i, st), units);
    const cl = s.indexOf("```", st + 3);
    const inner = (cl === -1 ? s.slice(st + 3) : s.slice(st + 3, cl)).replace(/^\n/, "").replace(/\n$/, "");
    if (inner.trim()) units.push({ type: "code", text: inner });
    i = cl === -1 ? s.length : cl + 3;
  }
  return units;
}

/**
 * When "Another box." is immediately followed by the short [SYSTEM] greeting fence,
 * merge into one comic unit so the readout can live in the panel figure (not a separate tier).
 */
function mergeAnotherBoxSystemGreeting(units) {
  const out = [];
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];
    const next = units[i + 1];
    if (
      u.type === "prose" &&
      next?.type === "code" &&
      u.text.replace(/\s+$/, "").endsWith("Another box.") &&
      /\[SYSTEM\]/.test(next.text) &&
      next.text.trim().length < 220
    ) {
      out.push({ type: "proseHud", prose: u.text, hudCode: next.text.trimEnd() });
      i += 1;
      continue;
    }
    out.push(u);
  }
  return out;
}

/**
 * Ch. 1: the [STABILITY NOTICE] fence sits right before "Max wiped his face…".
 * For the comic we want one full-width image + that caption only, so fold the
 * readout into the following prose unit as art direction (still in the MD for
 * the prose reader / script).
 */
function mergeStabilityNoticeIntoWipeFace(units) {
  const out = [];
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];
    const next = units[i + 1];
    if (
      u.type === "code" &&
      /\[STABILITY NOTICE\]/i.test(u.text) &&
      next?.type === "prose" &&
      /^Max wiped his face\./i.test(next.text.trim())
    ) {
      const hudHint = u.text.replace(/\s+/g, " ").trim();
      const extra = `Scene also includes a faint floating readout with soft glow, lines similar to: ${hudHint}. Keep HUD abstract, not micro-legible.`;
      out.push({
        type: "prose",
        text: next.text,
        artDirective: next.artDirective ? `${next.artDirective} ${extra}` : extra,
      });
      i += 1;
      continue;
    }
    out.push(u);
  }
  return out;
}

/**
 * Ch. 1: "helper bot / EV suit" beat + V.A.L.U. welcome dialogue + "voice was warm"
 * become one full-width comic panel: one plate, caption strip (first + third beat),
 * speech balloon (middle beat). Manuscript stays three paragraphs for the prose reader.
 * Art on disk: `media/novel/ch01/panel-20.webp` for comic id `novel-p20` (import maps SS Panel 13 -> 20; see `BUILTIN_CHAPTER_PANEL_MAP` in import-novel-panels.mjs). Generator also accepts `SS-Novel-CH1-Page-1-Panel-13.*` in that folder if `panel-20.webp` is absent.
 */
function mergeValuOrientationSplash(units) {
  const out = [];
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];
    const a = units[i + 1];
    const b = units[i + 2];
    if (
      u.type === "prose" &&
      a?.type === "prose" &&
      b?.type === "prose" &&
      /The helper bot squared the EV suit/i.test(u.text) &&
      /Welcome,\s*Valued Asset #864/i.test(a.text) &&
      /^The voice was warm,\s*polished,\s+and\s+weaponized\.?\s*$/i.test(b.text.trim())
    ) {
      const dirs = [u.artDirective, a.artDirective, b.artDirective].filter(Boolean);
      out.push({
        type: "proseComicComposite",
        captionMd: `${u.text.trim()}\n\n${b.text.trim()}`,
        balloonMd: a.text.trim(),
        artDirective: dirs.length ? dirs.join(" ") : null,
      });
      i += 2;
      continue;
    }
    out.push(u);
  }
  return out;
}

/**
 * Ch. 1: "Where am I?" + orientation reply → one full-width panel, two speech
 * balloons over the art (manuscript stays two paragraphs for the prose reader).
 * Art: comic gid 21; SS `Page-1-Panel-14` → `panel-21.webp` (see import built-in map).
 */
function mergeWhereAmIOrientationReply(units) {
  const out = [];
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];
    const a = units[i + 1];
    if (
      u.type === "prose" &&
      a?.type === "prose" &&
      /Where am I/i.test(u.text) &&
      /You'?re asking amazing questions already/i.test(a.text)
    ) {
      const dirs = [u.artDirective, a.artDirective].filter(Boolean);
      out.push({
        type: "proseDualOverlay",
        maxBubbleMd: u.text.trim(),
        robotBubbleMd: a.text.trim(),
        artDirective: dirs.length ? dirs.join(" ") : null,
      });
      i += 1;
      continue;
    }
    out.push(u);
  }
  return out;
}

/**
 * Ch. 1: "The blue UI erupted." + `[CORE ATTRIBUTES DETECTED]…` fence → one
 * half-page sys panel (manuscript stays two blocks for the prose reader). HTML
 * shows figure + caption only; readout text is expected on the art. Queue uses
 * `gidIncrement: 2` so this cell keeps comic id 25 after the preceding pulse
 * panel 23 (skips the absorbed 24 slot).
 */
function mergeBlueUiIntoCoreAttributesReadout(units) {
  const out = [];
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];
    const next = units[i + 1];
    if (
      u.type === "prose" &&
      next?.type === "code" &&
      /^The blue UI erupted\.?\s*$/i.test(u.text.replace(/\s+/g, " ").trim()) &&
      /\[CORE ATTRIBUTES DETECTED\]/i.test(next.text)
    ) {
      out.push({
        type: "code",
        text: next.text,
        bubbleMd: "THE BLUE UI ERUPTED",
        readoutAsArtOnly: true,
        gidIncrement: 2,
        artDirective: u.artDirective || null,
      });
      i += 1;
      continue;
    }
    out.push(u);
  }
  return out;
}

function unitToQueueItem(u) {
  if (u.type === "code") {
    const q = { code: u.text };
    if (u.bubbleMd) q.bubbleMd = u.bubbleMd;
    if (u.readoutAsArtOnly) q.readoutAsArtOnly = true;
    if (u.gidIncrement != null) q.gidIncrement = u.gidIncrement;
    if (u.artDirective) q.artDirective = u.artDirective;
    return q;
  }
  if (u.type === "proseHud") return { proseHud: u };
  if (u.type === "proseDualOverlay") return { proseDualOverlay: u };
  if (u.type === "proseComicComposite") return { proseComicComposite: u };
  if (u.type === "artHint") return { artHint: u.artDirective };
  return { prose: u.text, artDirective: u.artDirective || null };
}

/**
 * `<!-- art: ... -->` directly above (or inline at the start of) a paragraph
 * attaches extra staging for the panel art prompt; the paragraph body is still
 * the panel's bubble text and is always quoted in the prompt as the story beat.
 */
function extractArtDirective(rawParagraph) {
  const re = /^\s*<!--\s*art:\s*([\s\S]*?)\s*-->\s*\n?/i;
  const m = re.exec(rawParagraph);
  if (!m) return { artDirective: null, body: rawParagraph };
  const artDirective = m[1].replace(/\s+/g, " ").trim();
  const body = rawParagraph.slice(m[0].length);
  return { artDirective: artDirective || null, body };
}

function pushProseUnits(chunk, units) {
  chunk.split(/\n\n+/).forEach((raw) => {
    const t = raw.trim();
    if (!t || /^-{3,}\s*$/.test(t)) return;
    const { artDirective, body } = extractArtDirective(t);
    const text = body.replace(/\s+/g, " ").trim();
    if (!text) {
      if (artDirective) {
        units.push({ type: "artHint", artDirective });
      }
      return;
    }
    units.push({ type: "prose", text, artDirective });
  });
}

function charBudgetForSpan(span) {
  if (span === "12") return 1200;
  if (span === "8") return 640;
  if (span === "6") return 340;
  if (span === "4") return 200;
  return 320;
}

function consumeProseFromQueue(queue, budget) {
  const item = queue[0];
  if (!item || item.code !== undefined || item.proseHud !== undefined) return { chunkMd: "" };
  const full = item.prose;
  const directive = item.artDirective || null;
  const plain = markdownToPlainSpan(full);
  if (plain.length <= budget) {
    queue.shift();
    return { chunkMd: full, artDirective: directive };
  }
  const words = full.split(/\s+/);
  let acc = "";
  let take = 0;
  for (let i = 0; i < words.length; i += 1) {
    const tryAcc = acc ? `${acc} ${words[i]}` : words[i];
    if (markdownToPlainSpan(tryAcc).length > budget && acc) break;
    acc = tryAcc;
    take = i + 1;
  }
  if (!acc && words.length) {
    acc = words[0].length > budget + 8 ? `${words[0].slice(0, budget)}…` : words[0];
    take = 1;
  }
  const rest = words.slice(take).join(" ").trim();
  if (rest) queue[0] = { prose: rest, artDirective: null };
  else queue.shift();
  const ellipsis = rest ? "…" : "";
  return { chunkMd: `${acc}${ellipsis}`, artDirective: directive };
}

function rebalanceRowSpans(row) {
  const n = row.length;
  if (n === 1) row[0].span = "12";
  else if (n === 2) {
    row[0].span = "6";
    row[1].span = "6";
  } else if (n === 3) {
    row[0].span = "4";
    row[1].span = "4";
    row[2].span = "4";
  } else if (n === 4) {
    row[0].span = "6";
    row[1].span = "6";
    row[2].span = "6";
    row[3].span = "6";
  }
}

/** True when this prose chunk was cut mid-beat by `consumeProseFromQueue` (unicode ellipsis). */
function endsWithSplitContinuation(chunkMd) {
  if (!chunkMd || typeof chunkMd !== "string") return false;
  const plain = markdownToPlainSpan(chunkMd).replace(/\s+$/, "");
  return plain.endsWith("…");
}

/** Marks adjacent prose balloons that continue across panels (same row or page break). */
function annotateNovelBubbleChains(pages) {
  for (let pi = 0; pi < pages.length; pi += 1) {
    const row = pages[pi];
    for (let j = 0; j < row.length; j += 1) {
      const cell = row[j];
      if (cell.kind !== "prose") continue;
      const prevCell = j > 0 ? row[j - 1] : pi > 0 ? pages[pi - 1][pages[pi - 1].length - 1] : null;
      const nextCell = j < row.length - 1 ? row[j + 1] : pi < pages.length - 1 ? pages[pi + 1][0] : null;
      const fromPrev = prevCell?.kind === "prose" && endsWithSplitContinuation(prevCell.chunkMd);
      const toNext = endsWithSplitContinuation(cell.chunkMd) && nextCell?.kind === "prose";
      if (fromPrev || toNext) cell.bubbleChain = { fromPrev, toNext };
    }
  }
}

/** Turn chapter markdown into comic rows (each row = one printed “page” of panels). */
function buildComicPages(ch) {
  const units = mergeBlueUiIntoCoreAttributesReadout(
    mergeWhereAmIOrientationReply(
      mergeValuOrientationSplash(
        mergeAnotherBoxSystemGreeting(mergeStabilityNoticeIntoWipeFace(chapterUnitsFromMd(ch.bodyMd))),
      ),
    ),
  );
  const queue = units.map(unitToQueueItem);
  const pages = [];
  let gid = 0;
  let guard = 0;
  while (queue.length > 0 && guard < 800) {
    guard += 1;
    const layout = normalizeLayout(layoutSpansForPage(ch, pages.length));
    const spansTemplate = layout.spans;
    const row = [];
    for (const span0 of spansTemplate) {
      if (!queue.length) break;
      const budget = charBudgetForSpan(span0);
      const head = queue[0];
      if (head.artHint !== undefined) {
        queue.shift();
        continue;
      }
      if (head.proseDualOverlay !== undefined) {
        const u = head.proseDualOverlay;
        queue.shift();
        gid += 1;
        row.push({
          span: span0,
          kind: "proseDualOverlay",
          maxBubbleMd: u.maxBubbleMd,
          robotBubbleMd: u.robotBubbleMd,
          gid,
          artDirective: u.artDirective || null,
        });
        continue;
      }
      if (head.proseComicComposite !== undefined) {
        const u = head.proseComicComposite;
        queue.shift();
        gid += 1;
        row.push({
          span: span0,
          kind: "proseComposite",
          captionMd: u.captionMd,
          balloonMd: u.balloonMd,
          gid,
          artDirective: u.artDirective || null,
        });
        continue;
      }
      if (head.code !== undefined) {
        queue.shift();
        gid += head.gidIncrement ?? 1;
        const codeCell = {
          span: span0,
          kind: "code",
          code: head.code,
          gid,
          readoutAsArtOnly: Boolean(head.readoutAsArtOnly),
          artDirective: head.artDirective || null,
        };
        if (head.bubbleMd) codeCell.bubbleMd = head.bubbleMd;
        /* When real panel art exists for this beat, the rendered art already
           carries the code text. Absorb the next prose unit as the panel's
           caption bubble and bump gid so downstream panels keep their numbers. */
        if (
          !codeCell.readoutAsArtOnly &&
          !codeCell.bubbleMd &&
          realPanelArtSrc(ch.n, gid, "../../") &&
          queue[0]?.prose !== undefined
        ) {
          const absorbed = queue.shift();
          codeCell.bubbleMd = absorbed.prose;
          gid += 1;
        }
        row.push(codeCell);
        continue;
      }
      if (head.proseHud !== undefined) {
        const { prose, hudCode } = head.proseHud;
        queue.shift();
        gid += 1;
        const cellGid = gid;
        let proseOut = prose;
        /* Mirror the code-cell behaviour: when real art exists, the rendered
           image already carries the HUD line, so we can pull the next prose
           beat into the same bubble for a single consolidated panel. */
        if (realPanelArtSrc(ch.n, cellGid, "../../") && queue[0]?.prose !== undefined) {
          const absorbed = queue.shift();
          proseOut = `${proseOut} ${absorbed.prose}`.trim();
          gid += 1;
        }
        row.push({ span: span0, kind: "proseHud", prose: proseOut, hudCode, gid: cellGid });
        continue;
      }
      const { chunkMd, artDirective } = consumeProseFromQueue(queue, budget);
      if (!chunkMd.trim()) {
        if (queue[0]?.prose !== undefined) queue.shift();
        break;
      }
      gid += 1;
      row.push({ span: span0, kind: "prose", chunkMd, gid, artDirective: artDirective || null });
    }
    if (!layout.fixed) rebalanceRowSpans(row);
    if (row.length) pages.push(row);
    else break;
  }
  return pages;
}

function bubbleClassesForNovelCell(cell, gid, span) {
  const wide = span === "12" ? " rules-comic__bubble--wide" : "";
  const bc = cell.bubbleChain;
  let tail = gid % 2 === 1 ? "rules-comic__bubble--tail-t" : "rules-comic__bubble--tail-b";
  const mods = [];
  if (bc?.fromPrev && bc?.toNext) {
    tail = "rules-comic__bubble--tail-t";
    mods.push("novel-comic__balloon--chain-prev", "novel-comic__balloon--chain-next");
  } else if (bc?.fromPrev) {
    tail = "rules-comic__bubble--tail-t";
    mods.push("novel-comic__balloon--chain-prev");
  } else if (bc?.toNext) {
    tail = "rules-comic__bubble--tail-b";
    mods.push("novel-comic__balloon--chain-next");
  }
  const modStr = mods.length ? `${mods.join(" ")} ` : "";
  return `rules-comic__bubble novel-comic__balloon ${modStr}${tail}${wide}`.replace(/\s+/g, " ").trim();
}

function panelFigureDims(span) {
  if (span === "12") return { w: 1200, h: 600 };
  return { w: 800, h: 1000 };
}

/** Optional extra basenames (no extension) after `panel-{gid}`. SS export names + legacy `panel-13` when artists match SS panel index (merged splash is comic gid 20). */
const NOVEL_DISK_FILENAME_ALIASES = {
  "1:6": ["SS-Novel-CH1-Page-1-Panel-5"],
  "1:8": ["SS-Novel-CH1-Page-1-Panel-6"],
  "1:9": ["SS-Novel-CH1-Page-1-Panel-7"],
  "1:10": [
    "SS-Novel-CH1-Page-1-Panel-8-topleft",
    "SS-Novel-CH1-Page-1-Panel-8-topLeft",
  ],
  "1:11": [
    "SS-Novel-CH1-Page-1-Panel-8-topright",
    "SS-Novel-CH1-Page-1-Panel-8-topRight",
  ],
  "1:12": [
    "SS-Novel-CH1-Page-1-Panel-8-bottomleft",
    "SS-Novel-CH1-Page-1-Panel-8-bottomLeft",
  ],
  "1:13": [
    "SS-Novel-CH1-Page-1-Panel-8-bottomright",
    "SS-Novel-CH1-Page-1-Panel-8-bottomRight",
  ],
  "1:14": ["SS-Novel-CH1-Page-1-Panel-9"],
  "1:15": ["SS-Novel-CH1-Page-1-Panel-10left", "SS-Novel-CH1-Page-1-Panel-10-left"],
  "1:16": ["SS-Novel-CH1-Page-1-Panel-10right", "SS-Novel-CH1-Page-1-Panel-10-right"],
  "1:17": ["SS-Novel-CH1-Page-1-Panel-11left", "SS-Novel-CH1-Page-1-Panel-11-left"],
  "1:18": ["SS-Novel-CH1-Page-1-Panel-11right", "SS-Novel-CH1-Page-1-Panel-11-right"],
  "1:19": ["SS-Novel-CH1-Page-1-Panel-12"],
  "1:20": ["SS-Novel-CH1-Page-1-Panel-13", "panel-13"],
  "1:21": ["SS-Novel-CH1-Page-1-Panel-14"],
  "1:22": ["SS-Novel-CH1-Page-1-Panel-15"],
  "1:26": ["SS-Novel-CH1-Page-1-Panel-17"],
  /* Comic page 16 (print): pulse (gid 23) + CORE ATTRIBUTES / blue UI (gid 25). */
  "1:23": [
    "panel-16left",
    "panel-16-left",
    "SS-Novel-CH1-Page-1-Panel-16-left",
    "SS-Novel-CH1-Page-1-Panel-16Left",
    "CH1-comic-page16-left",
  ],
  "1:25": [
    "panel-16right",
    "panel-16-right",
    "SS-Novel-CH1-Page-1-Panel-16-right",
    "SS-Novel-CH1-Page-1-Panel-16Right",
    "CH1-comic-page16-right",
  ],
};

const NOVEL_PANEL_MEDIA_EXTS = [".webp", ".png", ".jpg", ".jpeg"];

/**
 * When print page 16 art is exported with non-canonical names (e.g. `panel-16left`
 * instead of `panel-23.webp`), pick the first matching file in the chapter folder.
 */
function chapter1ComicPage16SplitFallback(dir, gid) {
  if (!fs.existsSync(dir)) return null;
  const matches = [];
  for (const name of fs.readdirSync(dir)) {
    const ext = path.extname(name).toLowerCase();
    if (!NOVEL_PANEL_MEDIA_EXTS.includes(ext)) continue;
    const stem = path.basename(name, ext).toLowerCase();
    const i = stem.indexOf("16");
    if (i < 0) continue;
    const tail = stem.slice(i + 2);
    if (gid === 23 && tail.includes("left") && !tail.includes("right")) matches.push(name);
    if (gid === 25 && tail.includes("right")) matches.push(name);
  }
  if (!matches.length) return null;
  const rank = (fname) => {
    const s = fname.toLowerCase();
    if (gid === 23) {
      if (s.startsWith("panel-16left")) return 0;
      if (s.startsWith("panel-16-left")) return 1;
      if (s.includes("16left")) return 2;
      return 5;
    }
    if (s.startsWith("panel-16right")) return 0;
    if (s.startsWith("panel-16-right")) return 1;
    if (s.includes("16right")) return 2;
    return 5;
  };
  matches.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return { fname: matches[0] };
}

/**
 * First matching file in the chapter media dir: canonical `panel-{gid}.webp` first, then aliases.
 * @returns {{ fname: string } | null}
 */
function resolveNovelPanelOnDisk(chapterN, gid, artFileGid) {
  const chPad = String(chapterN).padStart(2, "0");
  const dir = path.join(websiteRoot, "media", "novel", `ch${chPad}`);
  const fileGid = artFileGid != null ? artFileGid : gid;
  const gidPad = String(fileGid).padStart(2, "0");
  const basenames = [`panel-${gidPad}`];
  for (const a of NOVEL_DISK_FILENAME_ALIASES[`${chapterN}:${gid}`] || []) {
    if (!basenames.includes(a)) basenames.push(a);
  }
  for (const base of basenames) {
    for (const ext of NOVEL_PANEL_MEDIA_EXTS) {
      const fname = base + ext;
      if (fs.existsSync(path.join(dir, fname))) return { fname };
    }
  }
  if (chapterN === 1 && (gid === 23 || gid === 25)) {
    const fb = chapter1ComicPage16SplitFallback(dir, gid);
    if (fb) return fb;
  }
  return null;
}

/**
 * Returns a relative src when panel art exists under media/novel/ch{nn}/.
 * `webToSiteRoot` is the prefix from the HTML file to the site root (e.g. "../../" from lore/novel/).
 */
function realPanelArtSrc(chapterN, gid, webToSiteRoot = "../../", artFileGid = null) {
  const hit = resolveNovelPanelOnDisk(chapterN, gid, artFileGid);
  if (!hit) return null;
  const chPad = String(chapterN).padStart(2, "0");
  const root = webToSiteRoot.replace(/\/?$/, "/");
  return `${root}media/novel/ch${chPad}/${hit.fname}`;
}

function railDotsComic(pageCount) {
  const items = [
    '<li><a class="b-rail__dot" href="#b-letter"><span class="sr-only">Top</span></a></li>',
    '<li><a class="b-rail__dot" href="#novel-comic"><span class="sr-only">Comic</span></a></li>',
  ];
  if (pageCount < 1) {
    items.push(
      '<li><a class="b-rail__dot" href="#novel-script"><span class="sr-only">Full script</span></a></li>',
    );
    return items.join("\n      ");
  }
  const maxDots = 12;
  const step = Math.max(1, Math.ceil(pageCount / maxDots));
  const seen = new Set();
  for (let p = 1; p <= pageCount; p += step) {
    if (seen.has(p)) continue;
    seen.add(p);
    items.push(
      `<li><a class="b-rail__dot" href="#novel-page-${p}"><span class="sr-only">Page ${p}</span></a></li>`,
    );
  }
  if (!seen.has(pageCount)) {
    items.push(
      `<li><a class="b-rail__dot" href="#novel-page-${pageCount}"><span class="sr-only">Page ${pageCount}</span></a></li>`,
    );
  }
  items.push(
    '<li><a class="b-rail__dot" href="#novel-script"><span class="sr-only">Full script</span></a></li>',
  );
  return items.join("\n      ");
}

function panelArtPromptForCell(ch, cell, pageNum) {
  const isSys = cell.kind === "code";
  const isProseHud = cell.kind === "proseHud";
  let actionBeat = "";
  let hudReadout = "";
  if (cell.kind === "proseComposite") {
    const cap = markdownToPlainSpan(cell.captionMd);
    const bal = markdownToPlainSpan(cell.balloonMd);
    actionBeat = `${cap} A speech balloon from the helper bot carries this line (typeset in post, not painted into the plate): ${bal}`;
  } else if (cell.kind === "proseDualOverlay") {
    const maxP = markdownToPlainSpan(cell.maxBubbleMd);
    const robP = markdownToPlainSpan(cell.robotBubbleMd);
    const maxLine =
      maxP.replace(/\s*Max asked\.?\s*$/i, "").replace(/^["']+|["']+$/g, "").trim() || "Where am I?";
    actionBeat = `Max says (speech balloon, not lettering in the plate): "${maxLine}". The helper bot / V.A.L.U. replies (separate balloon): "${robP}".`;
  } else if (cell.kind === "code") {
    hudReadout = String(cell.code || "").trim();
    if (cell.readoutAsArtOnly && cell.bubbleMd) {
      actionBeat = `Title-style caption below the plate (typeset later, not painted into the art): ${markdownToPlainSpan(cell.bubbleMd)}. Floating HUD readout—paint the full readout text into the image art.`;
    } else if (cell.bubbleMd) {
      /* If a prose beat was absorbed into this code panel as its caption bubble,
         that prose is the action being depicted. */
      actionBeat = markdownToPlainSpan(cell.bubbleMd);
    }
  } else if (cell.kind === "proseHud") {
    actionBeat = markdownToPlainSpan(cell.prose);
    hudReadout = String(cell.hudCode || "").trim();
  } else {
    actionBeat = markdownToPlainSpan(cell.chunkMd);
  }
  return buildPanelArtPrompt({
    chapterN: ch.n,
    title: ch.title,
    panelGid: cell.gid,
    pageNum,
    span: cell.span,
    actionBeat,
    hudReadout,
    isSys,
    isProseHud,
    artDirective: cell.artDirective || null,
    firstPersonHudCoreAttributes: Boolean(cell.kind === "code" && cell.readoutAsArtOnly),
  });
}

function novelComicArtPromptOverlay(prompt) {
  return `                        <div class="novel-comic__art-prompt" role="note" aria-label="Image prompt for this panel">
                          <p class="novel-comic__art-prompt-text">${esc(prompt)}</p>
                        </div>`;
}

function figureWithPlaceholderAndPrompt(ch, cell, pageNum, w, h, webToSiteRoot = "../../") {
  const prompt = panelArtPromptForCell(ch, cell, pageNum);
  const altFlat = prompt.replace(/\s+/g, " ").trim();
  const alt = altFlat.length > 220 ? `${altFlat.slice(0, 217)}…` : altFlat;
  const realSrc = realPanelArtSrc(ch.n, cell.gid, webToSiteRoot, cell.artFileGid ?? null);
  const root = webToSiteRoot.replace(/\/?$/, "/");
  if (realSrc) {
    return `                        <figure class="rules-comic__figure rules-comic__figure--art novel-comic__figure--with-art">
                          <img class="rules-comic__art" src="${realSrc}" width="${w}" height="${h}" alt="${esc(alt)}" loading="lazy" decoding="async">
                        </figure>`;
  }
  return `                        <figure class="rules-comic__figure rules-comic__figure--hud novel-comic__figure--with-prompt">
                          <img class="rules-comic__art rules-comic__art--prompt-underlay" src="${root}media/novel/chapter-placeholder.svg" width="${w}" height="${h}" alt="${esc(alt)}" decoding="async">
${novelComicArtPromptOverlay(prompt)}
                        </figure>`;
}

function proseHudFigureWithPrompt(ch, cell, pageNum, webToSiteRoot = "../../") {
  const prompt = panelArtPromptForCell(ch, cell, pageNum);
  const realSrc = realPanelArtSrc(ch.n, cell.gid, webToSiteRoot, cell.artFileGid ?? null);
  if (realSrc) {
    const altFlat = prompt.replace(/\s+/g, " ").trim();
    const alt = altFlat.length > 220 ? `${altFlat.slice(0, 217)}…` : altFlat;
    return `                        <figure class="rules-comic__figure rules-comic__figure--art novel-comic__figure--with-art">
                          <img class="rules-comic__art" src="${realSrc}" width="1600" height="900" alt="${esc(alt)}" loading="lazy" decoding="async">
                        </figure>`;
  }
  return `                        <figure class="rules-comic__figure rules-comic__figure--hud rules-comic__figure--novel-readout-art novel-comic__figure--with-prompt">
                          <div class="novel-panel__readout-as-art" aria-hidden="true">
                            <pre class="novel-panel__sys novel-panel__sys--in-figure"><code>${esc(cell.hudCode)}</code></pre>
                          </div>
${novelComicArtPromptOverlay(prompt)}
                        </figure>`;
}

function renderComicBookHtml(ch) {
  const pages = buildComicPages(ch);
  annotateNovelBubbleChains(pages);
  const chunks = [];
  for (let pi = 0; pi < pages.length; pi += 1) {
    const row = pages[pi];
    const gridChainMod = row.some((c) => c.bubbleChain) ? " novel-comic__grid--balloon-chain" : "";
    const pageNum = pi + 1;
    const inner = row
      .map((cell) => {
        const { w, h } = panelFigureDims(cell.span);
        const bubbleCls = bubbleClassesForNovelCell(cell, cell.gid, cell.span);
        if (cell.kind === "code") {
          const hasRealArt = !!realPanelArtSrc(ch.n, cell.gid, "../../", cell.artFileGid ?? null);
          const showReadoutStrip = !hasRealArt && !cell.readoutAsArtOnly;
          const readoutBlock = showReadoutStrip
            ? `
                        <div class="rules-comic__strip-note rules-comic__strip-note--novel-sys">
                          <p class="novel-panel__sys-label"><span class="rules-comic__kicker">Readout</span></p>
                          <pre class="novel-panel__sys"><code>${esc(cell.code)}</code></pre>
                        </div>`
            : "";
          const bubbleBlock = cell.bubbleMd
            ? `
                        <blockquote class="${bubbleCls}">
                          <p>${inlineMdToHtml(cell.bubbleMd)}</p>
                        </blockquote>`
            : "";
          const readoutOnArtCls = cell.readoutAsArtOnly ? " novel-panel--readout-on-art" : "";
          const hudData =
            cell.readoutAsArtOnly && cell.code
              ? ` data-novel-hud-readout="${encodeURIComponent(cell.code)}"`
              : "";
          return `                      <article class="rules-comic__panel novel-panel novel-panel--span-${cell.span} novel-panel--sys${readoutOnArtCls}" id="novel-p${cell.gid}"${hudData}>
                        <div class="rules-comic__frame" aria-hidden="true"></div>
${figureWithPlaceholderAndPrompt(ch, cell, pageNum, w, h)}${readoutBlock}${bubbleBlock}
                      </article>`;
        }
        if (cell.kind === "proseHud") {
          return `                      <article class="rules-comic__panel novel-panel novel-panel--span-${cell.span} novel-panel--prose-hud" id="novel-p${cell.gid}">
                        <div class="rules-comic__frame" aria-hidden="true"></div>
${proseHudFigureWithPrompt(ch, cell, pageNum)}
                        <blockquote class="${bubbleCls}">
                          <p>${inlineMdToHtml(cell.prose)}</p>
                        </blockquote>
                      </article>`;
        }
        if (cell.kind === "proseComposite") {
          const captionParas = cell.captionMd
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => `<p>${inlineMdToHtml(p)}</p>`)
            .join("\n                          ");
          const capBubbleCls = bubbleClassesForNovelCell(cell, cell.gid, cell.span);
          return `                      <article class="rules-comic__panel novel-panel novel-panel--span-${cell.span} novel-panel--composite-cap-bubble" id="novel-p${cell.gid}">
                        <div class="rules-comic__frame" aria-hidden="true"></div>
                        <div class="novel-comic__figure-with-overlay">
${figureWithPlaceholderAndPrompt(ch, cell, pageNum, w, h)}
                        <aside class="novel-comic__robot-speech novel-comic__robot-speech--over-art" aria-label="V.A.L.U. through the helper bot">
                          <p>${inlineMdToHtml(stripBalancedOuterQuotes(cell.balloonMd))}</p>
                        </aside>
                        </div>
                        <blockquote class="${capBubbleCls} novel-comic__balloon--composite-narration">
                          ${captionParas}
                        </blockquote>
                      </article>`;
        }
        if (cell.kind === "proseDualOverlay") {
          const maxPlain = markdownToPlainSpan(cell.maxBubbleMd)
            .replace(/\s*Max asked\.?\s*$/i, "")
            .replace(/^["']+|["']+$/g, "")
            .trim();
          const maxDisplay = maxPlain || "Where am I?";
          return `                      <article class="rules-comic__panel novel-panel novel-panel--span-${cell.span} novel-panel--dual-overlay-bubbles" id="novel-p${cell.gid}">
                        <div class="rules-comic__frame" aria-hidden="true"></div>
                        <div class="novel-comic__figure-with-overlay">
${figureWithPlaceholderAndPrompt(ch, cell, pageNum, w, h)}
                        <aside class="novel-comic__robot-speech novel-comic__overlaid-speech--ch1p14-max" aria-label="Max">
                          <p>${inlineMdToHtml(maxDisplay)}</p>
                        </aside>
                        <aside class="novel-comic__robot-speech novel-comic__overlaid-speech--ch1p14-robot" aria-label="V.A.L.U. through the helper bot">
                          <p>${inlineMdToHtml(stripBalancedOuterQuotes(cell.robotBubbleMd))}</p>
                        </aside>
                        </div>
                      </article>`;
        }
        return `                      <article class="rules-comic__panel novel-panel novel-panel--span-${cell.span}" id="novel-p${cell.gid}">
                        <div class="rules-comic__frame" aria-hidden="true"></div>
${figureWithPlaceholderAndPrompt(ch, cell, pageNum, w, h)}
                        <blockquote class="${bubbleCls}">
                          <p>${inlineMdToHtml(cell.chunkMd)}</p>
                        </blockquote>
                      </article>`;
      })
      .join("\n\n");
    chunks.push(`                  <section class="novel-comic-page" id="novel-page-${pi + 1}" aria-label="Page ${pi + 1}">
                    <header class="novel-comic-page__header">
                      <span class="novel-comic-page__issue">Ch. ${String(ch.n).padStart(2, "0")}</span>
                      <span class="novel-comic-page__num">Page ${pi + 1}</span>
                    </header>
                    <div class="novel-comic-page__panels">
                      <div class="rules-comic__grid rules-comic__grid--lore novel-comic__grid${gridChainMod}">
${inner}
                      </div>
                    </div>
                  </section>`);
  }
  return { html: chunks.join("\n\n"), pageCount: pages.length };
}

function chapterHtml(ch, allCount) {
  const pad = String(ch.n).padStart(2, "0");
  const prevLink =
    ch.n > 1
      ? `<a class="btn btn--ghost" href="ch${String(ch.n - 1).padStart(2, "0")}.html">← Ch. ${ch.n - 1}</a>`
      : `<span class="novel-pager__edge novel-pager__edge--mute" aria-hidden="true">←</span>`;
  const nextLink =
    ch.n < allCount
      ? `<a class="btn btn--ghost" href="ch${String(ch.n + 1).padStart(2, "0")}.html">Ch. ${ch.n + 1} →</a>`
      : `<span class="novel-pager__edge novel-pager__edge--mute" aria-hidden="true">→</span>`;
  const comic = renderComicBookHtml(ch);
  const railDotsHtml = railDotsComic(comic.pageCount);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(`Debt Protocol, Book 1 · Chapter ${ch.n}: ${ch.title}. Scroll comic with optional full script.`)}">
  <title>${esc(ch.title)} · Novel · Lore · Sector Scavengers</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400;1,9..40,600&family=JetBrains+Mono:wght@400;500;600;700&family=Orbitron:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../styles.css">
</head>
<body class="beer-page novel-chapter-page">
  <a class="skip-link" href="#novel-comic">Skip to comic</a>

  <div class="atmosphere" aria-hidden="true">
    <div class="atmosphere__grid"></div>
    <div class="atmosphere__vignette"></div>
    <div class="atmosphere__grain"></div>
  </div>

  <div class="b-progress" aria-hidden="true"></div>

  <header class="site-header site-header--over-dark">
    <div class="site-header__inner">
      <a class="logo" href="../../index.html">
        <span class="logo__mark" aria-hidden="true">◈</span>
        <span class="logo__text">Sector Scavengers</span>
      </a>
      <nav id="site-nav" class="nav" aria-label="Primary">
        <a href="../../index.html#how">How it plays</a>
        <a href="../../crew/index.html">Crew</a>
        <a href="../index.html">Lore</a>
        <a href="../origin-story.html">Origin</a>
        <a href="../beer-friday.html">Beer Friday</a>
        <a href="index.html">Novel</a>
        <a
          href="https://store.steampowered.com/app/4541430/Sector_Scavengers_Signal__Salvage/"
          class="nav__cta"
          target="_blank"
          rel="noopener noreferrer"
        >Wishlist</a>
      </nav>
      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu"></button>
    </div>
  </header>

  <aside class="b-rail" aria-label="Sections on this page">
    <span class="b-rail__label">Ch.${pad}</span>
    <ol class="b-rail__list">
      ${railDotsHtml}
    </ol>
  </aside>

  <main id="main" class="strip-page">
    <section class="rules rules--strip-page" aria-label="Chapter comic">
      <div class="rules__veil" aria-hidden="true"></div>
      <div class="rules__noise" aria-hidden="true"></div>
      <div class="rules__layout">
        <div class="rules__rail" aria-hidden="true">
          <span>FILE</span>
          <span>SS-Ω</span>
          <span>NOV</span>
        </div>
        <div class="rules__strip">
          <nav class="lore-breadcrumb" aria-label="Breadcrumb">
            <a href="../index.html">Lore</a>
            <span aria-hidden="true">/</span>
            <a href="index.html">Novel</a>
            <span aria-hidden="true">/</span>
            <span>Ch. ${ch.n} · ${esc(ch.title)}</span>
          </nav>

          <header class="strip-page__masthead reveal" data-reveal aria-labelledby="strip-page-title">
            <p class="strip-page__tags">
              <span class="strip-page__tag">Debt Protocol</span>
              <span class="strip-page__tag">Book 1</span>
              <span class="strip-page__tag">Ch. ${ch.n}</span>
            </p>
            <p class="strip-page__subject">Debt Protocol · Chapter ${ch.n}</p>
            <h1 id="strip-page-title" class="rules__title">${esc(ch.title)}</h1>
          </header>

          <article class="b-story strip-page__story">
            <div class="b-letter" id="b-letter">
              <div class="b-letter__shell">
                <div class="b-letter__toolbar" aria-hidden="true">
                  <span class="b-letter__traffic"></span>
                  <span class="b-letter__traffic"></span>
                  <span class="b-letter__traffic"></span>
                  <span class="b-letter__window-title">Debt Protocol · Book 1 · Chapter ${ch.n}</span>
                </div>
                <div class="b-letter__header-block">
                  <h2 class="b-letter__subject">Re: Debt Protocol · Chapter ${ch.n}</h2>
                  <div class="b-letter__headers">
                    <p class="b-letter__hdr-line">
                      <span class="b-letter__label">From:</span>
                      <span class="b-letter__name">Debt Protocol · archived transmission</span>
                    </p>
                    <p class="b-letter__hdr-line">
                      <span class="b-letter__label">Subject:</span>
                      <span class="b-letter__to">${esc(ch.title)}</span>
                    </p>
                  </div>
                </div>
                <div class="b-letter__divider" role="separator"></div>
                <div class="b-letter__body">
                  <div id="novel-comic" class="novel-comic-book b-letter__comic rules-comic rules-comic--lore novel-comic" role="region" aria-label="Chapter comic">
                    <p class="rules-comic__narrator" aria-hidden="true">
                      <span class="rules-comic__narrator-k">SS-Ω</span>
                      <span class="rules-comic__narrator-t">Debt Protocol · Book 1 · Chapter ${ch.n}</span>
                    </p>
${comic.html}
                  </div>

                  <details id="novel-script" class="novel-comic-script">
                    <summary class="novel-comic-script__summary">Full chapter script</summary>
                    <div class="novel-chapter__text b-letter__prose">
                      ${ch.bodyHtml}
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <footer class="b-out">
              <div class="b-out__scan beer__scan" aria-hidden="true"></div>
              <p class="b-out__note">
                <strong>Debt Protocol</strong> is long-form fiction set in the world of <em>Sector Scavengers: Signal &amp; Salvage</em>.
              </p>
              <div class="b-out__actions novel-chapter__pager">
                ${prevLink}
                <a class="btn btn--primary" href="index.html">Novel hub</a>
                ${nextLink}
              </div>
            </footer>
          </article>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="site-footer__grid">
      <div>
        <p class="site-footer__brand">Sector Scavengers</p>
        <p class="site-footer__tag">Signal &amp; Salvage</p>
      </div>
      <div class="site-footer__links">
        <a href="../../index.html#how">How it plays</a>
        <a href="../../crew/index.html">Crew</a>
        <a href="../index.html">Lore</a>
        <a href="../origin-story.html">Origin</a>
        <a href="../beer-friday.html">Beer Friday</a>
        <a href="index.html">Novel</a>
        <a href="../../index.html#cta">Wishlist</a>
      </div>
      <p class="site-footer__copy">© <span id="year"></span></p>
    </div>
  </footer>

  <script src="../../site.js"></script>
</body>
</html>
`;
}

/* Hand-written, story-first descriptions for the novel hub.
   Keys are chapter numbers. Falsey/missing => fall back to the generated teaser
   from the chapter source. Use plain prose, no art directives. */
const NOVEL_HUB_DESCRIPTIONS = {
  1: "Max wakes mid-scream in a cryopod, owing a corporation that barely remembers his name. The thaw is the easy part. Blue text in the air, a polite welcome from V.A.L.U., and a debt ledger waiting to greet him are the rest.",
};

/* Chapters listed here render as non-clickable “Coming soon” cards on the hub.
   Ch1 is the only one playable right now; everything else is in the pipeline. */
const NOVEL_HUB_LIVE = new Set([1]);

/* Chapters that get a secondary “Read as scroll” link on the novel hub card. */
const NOVEL_HUB_SCROLL_LINK = new Set([1]);

function indexHtml(chapters) {
  const cards = chapters
    .map((ch) => {
      const isLive = NOVEL_HUB_LIVE.has(ch.n);
      const desc = NOVEL_HUB_DESCRIPTIONS[ch.n] || (isLive ? ch.teaser : "Coming soon.");
      if (!isLive) {
        return `
      <li>
        <div class="lore-hub__card lore-hub__card--soon novel-hub__card" aria-disabled="true">
          <span class="lore-hub__card-tag">Ch. ${ch.n}</span>
          <h2 class="lore-hub__card-title">${esc(ch.title)}</h2>
          <p class="lore-hub__card-desc">Coming soon.</p>
        </div>
      </li>`;
      }
      const scrollPad = String(ch.n).padStart(2, "0");
      const scrollRow = NOVEL_HUB_SCROLL_LINK.has(ch.n)
        ? `
          <p class="novel-hub__card-links">
            <a class="novel-hub__card-link" href="scroll/ch${scrollPad}.html">Read as scroll</a>
          </p>`
        : "";
      return `
      <li>
        <div class="lore-hub__card lore-hub__card--live novel-hub__card novel-hub__card--stacked">
          <a class="novel-hub__card-main" href="ch${scrollPad}.html">
            <span class="lore-hub__card-tag">Ch. ${ch.n}</span>
            <h2 class="lore-hub__card-title">${esc(ch.title)}</h2>
            <p class="lore-hub__card-desc">${esc(desc)}</p>
          </a>${scrollRow}
        </div>
      </li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Debt Protocol: Book 1 of Sector Scavengers as a scroll comic—optional full script per chapter.">
  <title>Novel · Lore · Sector Scavengers</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400;1,9..40,600&family=JetBrains+Mono:wght@400;500;600;700&family=Orbitron:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../styles.css">
</head>
<body class="lore-hub novel-hub">
  <a class="skip-link" href="#main">Skip to content</a>

  <div class="atmosphere" aria-hidden="true">
    <div class="atmosphere__grid"></div>
    <div class="atmosphere__vignette"></div>
    <div class="atmosphere__grain"></div>
  </div>

  <header class="site-header">
    <div class="site-header__inner">
      <a class="logo" href="../../index.html">
        <span class="logo__mark" aria-hidden="true">◈</span>
        <span class="logo__text">Sector Scavengers</span>
      </a>
      <nav id="site-nav" class="nav" aria-label="Primary">
        <a href="../../index.html#how">How it plays</a>
        <a href="../../crew/index.html">Crew</a>
        <a href="../index.html">Lore</a>
        <a href="../origin-story.html">Origin</a>
        <a href="../beer-friday.html">Beer Friday</a>
        <a href="index.html" aria-current="page">Novel</a>
        <a
          href="https://store.steampowered.com/app/4541430/Sector_Scavengers_Signal__Salvage/"
          class="nav__cta"
          target="_blank"
          rel="noopener noreferrer"
        >Wishlist</a>
      </nav>
      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu"></button>
    </div>
  </header>

  <main id="main">
    <section class="rules rules--lore-hub novel-hub__section" aria-label="Novel archive">
      <div class="rules__veil" aria-hidden="true"></div>
      <div class="rules__noise" aria-hidden="true"></div>
      <div class="rules__layout">
        <div class="rules__rail" aria-hidden="true">
          <span>FILE</span>
          <span>SS-Ω</span>
          <span>NOV</span>
        </div>
        <div class="rules__strip lore-hub__strip">
          <nav class="lore-breadcrumb" aria-label="Breadcrumb">
            <a href="../index.html">Lore</a>
            <span aria-hidden="true">/</span>
            <span>Novel</span>
          </nav>

          <header class="lore-hub__masthead strip-page__masthead reveal" data-reveal aria-labelledby="novel-hub-title">
            <p class="rules__eyebrow lore-hub__eyebrow">Long-form</p>
            <h1 id="novel-hub-title" class="rules__title lore-hub__title">Debt Protocol</h1>
            <p class="rules__lead lore-hub__lede">
              Book 1 of the <em>Sector Scavengers</em> novel in scroll-comic form—panel balloons carry the story; open <strong>Full chapter script</strong> anytime for continuous prose.
            </p>
          </header>

          <ul class="lore-hub__list novel-hub__list">
${cards}
          </ul>

          <p class="lore-hub__footnote novel-hub__footnote">
            Chapters are meant to be read in order.
          </p>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="site-footer__grid">
      <div>
        <p class="site-footer__brand">Sector Scavengers</p>
        <p class="site-footer__tag">Signal &amp; Salvage</p>
      </div>
      <div class="site-footer__links">
        <a href="../../index.html#how">How it plays</a>
        <a href="../../crew/index.html">Crew</a>
        <a href="../index.html">Lore</a>
        <a href="../origin-story.html">Origin</a>
        <a href="../beer-friday.html">Beer Friday</a>
        <a href="index.html">Novel</a>
        <a href="../../index.html#cta">Wishlist</a>
      </div>
      <p class="site-footer__copy">© <span id="year"></span></p>
    </div>
  </footer>

  <script src="../../site.js"></script>
</body>
</html>
`;
}

function main() {
  if (!fs.existsSync(novelDir)) {
    console.error("Missing novel dir:", novelDir);
    process.exit(1);
  }
  const chapterFilter = parseChapterFilterFromArgv(process.argv);
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(novelDir).filter((f) => /^BOOK1_CH\d+_/i.test(f) && f.endsWith(".md"));
  const chapters = files
    .map(parseChapter)
    .filter(Boolean)
    .sort((a, b) => a.n - b.n);
  if (!chapters.length) {
    console.error("No BOOK1_CH*.md files in", novelDir);
    process.exit(1);
  }
  const n = chapters.length;
  const relSource = path.relative(websiteRoot, novelDir) || ".";
  console.log("Novel source:", relSource);
  const written = [];
  for (const ch of chapters) {
    if (chapterFilter && !chapterFilter.has(ch.n)) continue;
    const html = chapterHtml(ch, n);
    fs.writeFileSync(path.join(outDir, `ch${String(ch.n).padStart(2, "0")}.html`), html, "utf8");
    written.push(ch.n);
  }
  if (chapterFilter) {
    const missing = [...chapterFilter].filter((k) => !written.includes(k));
    if (missing.length) console.warn("No manuscript / skipped for chapter(s):", missing.join(", "));
    if (!written.length) console.warn("No chapter HTML written; index still refreshed from all manuscripts.");
  }
  fs.writeFileSync(path.join(outDir, "index.html"), indexHtml(chapters), "utf8");
  if (chapterFilter) {
    console.log(
      "Wrote",
      written.length,
      "chapter page(s) + index.html →",
      outDir,
      "(" + written.map((x) => `ch${String(x).padStart(2, "0")}`).join(", ") + ")",
    );
  } else {
    console.log("Wrote", n, "chapter pages + novel/index.html →", outDir);
  }
}

export {
  websiteRoot,
  novelDir,
  esc,
  inlineMdToHtml,
  novelMarkdownToHtml,
  parseChapter,
  buildComicPages,
  annotateNovelBubbleChains,
  realPanelArtSrc,
  panelFigureDims,
  panelArtPromptForCell,
  novelComicArtPromptOverlay,
  figureWithPlaceholderAndPrompt,
  proseHudFigureWithPrompt,
  bubbleClassesForNovelCell,
  NOVEL_HUB_LIVE,
};

const thisFile = path.resolve(fileURLToPath(import.meta.url));
const invokedAsCli = process.argv[1] && path.resolve(process.argv[1]) === thisFile;
if (invokedAsCli) main();
