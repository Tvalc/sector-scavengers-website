/**
 * Phone-friendly prose reader for the Sector Scavengers novel.
 *
 * Reads BOOK1_CH*.md (prefer website `book1/`, else ../sector-scavengers/novel)
 * and writes lore/novel/read/ch01.html … plus index.html.
 * No comic panel scaffolding, no panel art prompts, no embedded art.
 *
 * Run: node scripts/generate-novel-reader.mjs [--chapter N | --chapters 1,2]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveNovelDir, parseChapterFilterFromArgv } from "./novel-source.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(__dirname, "..");
const novelDir = resolveNovelDir(websiteRoot);
const outDir = path.join(websiteRoot, "lore", "novel", "read");

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

function inlineMdToHtml(raw) {
  const chunks = [];
  let x = raw;
  x = x.replace(/`([^`]+)`/g, (_, c) => {
    const id = `\uE000${chunks.length}\uE001`;
    chunks.push(`<code>${esc(c)}</code>`);
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

function stripArtDirectives(md) {
  return md.replace(/<!--\s*art:[\s\S]*?-->\s*\n?/gi, "");
}

function extractChapterBody(fullText, chapterN) {
  const lines = fullText.replace(/\r\n/g, "\n").split("\n");
  const headerRe = new RegExp(`^## Chapter ${chapterN}:\\s*.+$`);
  for (let i = 0; i < lines.length; i += 1) {
    if (headerRe.test(lines[i])) {
      let start = i + 1;
      while (start < lines.length && lines[start].trim() === "") start += 1;
      return lines.slice(start).join("\n").trim();
    }
  }
  return fullText.trim();
}

function proseSegmentToHtml(segment) {
  const t = stripArtDirectives(segment).trim();
  if (!t) return "";
  const paras = t.split(/\n\n+/);
  const out = [];
  for (const rawP of paras) {
    const p = rawP.trim();
    if (!p) continue;
    if (/^-{3,}\s*$/.test(p)) {
      out.push('<hr class="read-rule" />');
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

/**
 * Same paragraph/code unit counting the comic generator uses so panel
 * indexes line up: each non-empty prose paragraph and each code fence
 * is one unit, in source order. Returned units are in source order.
 */
function novelUnitsFromMd(md) {
  const s = md.replace(/\r\n/g, "\n");
  if (!s.trim()) return [];
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
    const inner = s.slice(start + 3, close).replace(/^\n/, "").replace(/\n$/, "");
    segments.push({ type: "code", content: inner });
    i = close + 3;
  }
  const units = [];
  for (const seg of segments) {
    if (seg.type === "code") {
      const t = seg.content.trim();
      if (t) units.push({ kind: "code", text: seg.content });
      continue;
    }
    const cleaned = stripArtDirectives(seg.content);
    const paras = cleaned.split(/\n\n+/);
    for (const raw of paras) {
      const t = raw.trim();
      if (!t) continue;
      if (/^-{3,}\s*$/.test(t)) {
        units.push({ kind: "rule" });
        continue;
      }
      units.push({ kind: "prose", text: t });
    }
  }
  return units;
}

function panelImgRelSrc(chapterN, gid) {
  const chPad = String(chapterN).padStart(2, "0");
  const gidPad = String(gid).padStart(2, "0");
  const fsPath = path.join(websiteRoot, "media", "novel", `ch${chPad}`, `panel-${gidPad}.webp`);
  if (!fs.existsSync(fsPath)) return null;
  return `../../../media/novel/ch${chPad}/panel-${gidPad}.webp`;
}

function panelFigureHtml(src, gid) {
  return `<figure class="read-panel"><img src="${src}" alt="Panel ${gid}" loading="lazy" decoding="async"><figcaption>Panel ${gid}</figcaption></figure>`;
}

function unitsToHtml(units, chapterN) {
  const out = [];
  let gid = 0;
  for (const u of units) {
    if (u.kind === "rule") {
      out.push('<hr class="read-rule" />');
      continue;
    }
    gid += 1;
    const src = panelImgRelSrc(chapterN, gid);
    if (src) out.push(panelFigureHtml(src, gid));
    if (u.kind === "code") {
      out.push(`<pre class="read-hud"><code>${esc(u.text)}</code></pre>`);
    } else {
      out.push(proseSegmentToHtml(u.text));
    }
  }
  return out.filter(Boolean).join("\n");
}

function parseChapter(file) {
  const m = /^BOOK1_CH(\d+)_(.+)\.md$/i.exec(file);
  if (!m) return null;
  const num = m[1];
  const n = parseInt(num, 10);
  const rawSlug = m[2];
  const body = fs.readFileSync(path.join(novelDir, file), "utf8").replace(/\r\n/g, "\n");
  const titleMatch = new RegExp(`^## Chapter ${n}:\\s*(.+)$`, "m").exec(body);
  const title = titleMatch ? titleMatch[1].trim() : humanizeSlug(rawSlug);
  const bodyMd = extractChapterBody(body, n);
  const units = novelUnitsFromMd(bodyMd);
  const bodyHtml = unitsToHtml(units, n);
  const firstPara = bodyMd
    .split(/\n\n+/)
    .map((p) => stripArtDirectives(p).trim())
    .find((p) => p && !p.startsWith("```") && !/^-{3,}$/.test(p));
  const teaserRaw = firstPara
    ? firstPara
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[*_`]/g, "")
        .trim()
    : "";
  const teaser = teaserRaw.length > 220 ? teaserRaw.slice(0, 217) + "..." : teaserRaw;
  return { num, n, title, teaser, bodyHtml };
}

function chapterPageHtml(ch, prev, next) {
  const prevLink = prev
    ? `<a class="read-nav__link read-nav__link--prev" href="ch${prev.num}.html"><span class="read-nav__arrow">&larr;</span> <span class="read-nav__chapno">Ch ${prev.n}</span> <span class="read-nav__title">${esc(prev.title)}</span></a>`
    : `<span class="read-nav__link read-nav__link--disabled">First chapter</span>`;
  const nextLink = next
    ? `<a class="read-nav__link read-nav__link--next" href="ch${next.num}.html"><span class="read-nav__chapno">Ch ${next.n}</span> <span class="read-nav__title">${esc(next.title)}</span> <span class="read-nav__arrow">&rarr;</span></a>`
    : `<span class="read-nav__link read-nav__link--disabled">End of Book 1</span>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark light">
<meta name="description" content="${esc(ch.teaser)}">
<title>Ch ${ch.n}: ${esc(ch.title)} | Sector Scavengers, Book 1</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0c0f14;
    --ink: #e6e8ee;
    --muted: #98a0ad;
    --accent: #3b8edf;
    --rule: #1c2230;
    --hud-bg: #11151d;
    --hud-ink: #c7e0ff;
    --hud-border: #1f2a3a;
  }
  * { box-sizing: border-box; }
  html, body { background: var(--bg); color: var(--ink); }
  body {
    margin: 0;
    font-family: "Lora", Georgia, serif;
    font-size: 18px;
    line-height: 1.7;
    -webkit-text-size-adjust: 100%;
  }
  .read-shell {
    max-width: 38rem;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 5rem;
  }
  .read-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .read-top a { color: var(--accent); text-decoration: none; }
  .read-top a:hover { text-decoration: underline; }
  .read-eyebrow {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 0.5rem;
  }
  .read-title {
    font-family: "Lora", Georgia, serif;
    font-weight: 700;
    font-size: clamp(1.6rem, 1.3rem + 1.6vw, 2.2rem);
    line-height: 1.15;
    margin: 0 0 1.5rem;
    letter-spacing: -0.01em;
  }
  .read-prose p {
    margin: 0 0 1.15em;
  }
  .read-prose strong { color: #fff; }
  .read-prose em { color: #f0c8ff; font-style: italic; }
  .read-prose code,
  .read-prose .read-hud {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.86em;
    color: var(--hud-ink);
  }
  .read-prose code {
    background: var(--hud-bg);
    border: 1px solid var(--hud-border);
    border-radius: 4px;
    padding: 0.05em 0.35em;
  }
  .read-prose pre.read-hud {
    background: var(--hud-bg);
    border: 1px solid var(--hud-border);
    border-left: 3px solid var(--accent);
    border-radius: 6px;
    padding: 0.85rem 1rem;
    margin: 1.25rem 0;
    overflow-x: auto;
    line-height: 1.5;
    font-size: 0.85em;
  }
  .read-prose pre.read-hud code {
    background: transparent;
    border: 0;
    padding: 0;
  }
  .read-prose hr.read-rule {
    border: 0;
    border-top: 1px solid var(--rule);
    margin: 2.25rem auto;
    width: 4rem;
  }
  .read-panel {
    margin: 1.75rem -0.5rem;
    text-align: center;
  }
  .read-panel img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 6px;
    border: 1px solid var(--rule);
    background: #000;
  }
  .read-panel figcaption {
    margin-top: 0.45rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .read-nav {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--rule);
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.78rem;
  }
  .read-nav__link {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.75rem 0.9rem;
    border: 1px solid var(--rule);
    border-radius: 6px;
    text-decoration: none;
    color: var(--ink);
    background: rgba(255,255,255,0.02);
  }
  .read-nav__link:hover { border-color: var(--accent); }
  .read-nav__link--next { text-align: right; align-items: flex-end; }
  .read-nav__link--disabled { color: var(--muted); opacity: 0.55; }
  .read-nav__arrow { color: var(--accent); font-size: 0.95rem; }
  .read-nav__chapno {
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .read-nav__title {
    font-family: "Lora", Georgia, serif;
    font-size: 0.95rem;
    line-height: 1.25;
    color: var(--ink);
  }
  @media (max-width: 480px) {
    body { font-size: 17px; }
    .read-shell { padding: 1rem 1rem 4rem; }
    .read-nav { grid-template-columns: 1fr; }
    .read-nav__link--next { text-align: left; align-items: flex-start; }
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #fbf9f4;
      --ink: #1d2330;
      --muted: #5a6473;
      --accent: #1f6dc0;
      --rule: #e3ddd0;
      --hud-bg: #f3eee2;
      --hud-ink: #1b2a45;
      --hud-border: #d9d0b9;
    }
    .read-prose strong { color: #000; }
    .read-prose em { color: #6a2390; }
  }
</style>
</head>
<body>
  <main class="read-shell">
    <nav class="read-top" aria-label="Reader navigation">
      <a href="index.html">&larr; Chapters</a>
      <span>Book 1, Ch ${ch.n} / 25</span>
    </nav>
    <p class="read-eyebrow">Debt Protocol &middot; Book 1 &middot; Chapter ${ch.n}</p>
    <h1 class="read-title">${esc(ch.title)}</h1>
    <article class="read-prose">
${ch.bodyHtml}
    </article>
    <nav class="read-nav" aria-label="Chapter navigation">
      ${prevLink}
      ${nextLink}
    </nav>
  </main>
</body>
</html>
`;
}

function indexPageHtml(chapters) {
  const items = chapters
    .map(
      (ch) => `
      <li class="toc__item">
        <a class="toc__link" href="ch${ch.num}.html">
          <span class="toc__no">Ch ${ch.n}</span>
          <span class="toc__title">${esc(ch.title)}</span>
          <span class="toc__teaser">${esc(ch.teaser)}</span>
        </a>
      </li>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark light">
<title>Debt Protocol, Book 1 | Sector Scavengers Novel</title>
<meta name="description" content="Read Debt Protocol, Book 1 of the Sector Scavengers novel: 25 chapters, mobile-friendly reader.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0c0f14;
    --ink: #e6e8ee;
    --muted: #98a0ad;
    --accent: #3b8edf;
    --rule: #1c2230;
  }
  * { box-sizing: border-box; }
  html, body { background: var(--bg); color: var(--ink); }
  body {
    margin: 0;
    font-family: "Lora", Georgia, serif;
    font-size: 18px;
    line-height: 1.6;
    -webkit-text-size-adjust: 100%;
  }
  .read-shell {
    max-width: 42rem;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 5rem;
  }
  .read-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .read-top a { color: var(--accent); text-decoration: none; }
  .read-eyebrow {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 0.5rem;
  }
  .read-title {
    font-family: "Lora", Georgia, serif;
    font-weight: 700;
    font-size: clamp(1.8rem, 1.4rem + 2vw, 2.4rem);
    line-height: 1.1;
    margin: 0 0 0.5rem;
    letter-spacing: -0.01em;
  }
  .read-lede {
    color: var(--muted);
    max-width: 32rem;
    margin: 0 0 2rem;
  }
  .toc { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
  .toc__link {
    display: grid;
    grid-template-columns: 4rem 1fr;
    gap: 0.25rem 0.85rem;
    text-decoration: none;
    color: var(--ink);
    padding: 0.85rem 0.95rem;
    border: 1px solid var(--rule);
    border-radius: 8px;
    background: rgba(255,255,255,0.02);
  }
  .toc__link:hover { border-color: var(--accent); }
  .toc__no {
    grid-row: 1 / span 2;
    align-self: center;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .toc__title {
    font-family: "Lora", Georgia, serif;
    font-weight: 600;
    font-size: 1.05rem;
  }
  .toc__teaser {
    color: var(--muted);
    font-size: 0.92rem;
    line-height: 1.45;
  }
  @media (max-width: 480px) {
    body { font-size: 17px; }
    .read-shell { padding: 1rem 1rem 4rem; }
    .toc__link { grid-template-columns: 3.4rem 1fr; padding: 0.75rem 0.85rem; }
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #fbf9f4;
      --ink: #1d2330;
      --muted: #5a6473;
      --accent: #1f6dc0;
      --rule: #e3ddd0;
    }
  }
</style>
</head>
<body>
  <main class="read-shell">
    <nav class="read-top" aria-label="Site navigation">
      <a href="../../index.html">&larr; Home</a>
      <span>Reader View</span>
    </nav>
    <p class="read-eyebrow">Sector Scavengers</p>
    <h1 class="read-title">Debt Protocol, Book 1</h1>
    <p class="read-lede">Twenty-five chapters. A phone-friendly reader. Tap a chapter to start. Pages are static HTML, no app, no account, no tracking. Built from the same manuscript as the comic strip view.</p>
    <ol class="toc">
${items}
    </ol>
  </main>
</body>
</html>
`;
}

function main() {
  const chapterFilter = parseChapterFilterFromArgv(process.argv);
  const files = fs
    .readdirSync(novelDir)
    .filter((f) => /^BOOK1_CH\d+_.+\.md$/i.test(f))
    .sort();
  const chapters = files.map(parseChapter).filter(Boolean).sort((a, b) => a.n - b.n);
  if (!chapters.length) throw new Error("No chapter files found");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const relSource = path.relative(websiteRoot, novelDir) || ".";
  console.log("Novel source:", relSource);
  const written = [];
  let totalBytes = 0;
  for (let i = 0; i < chapters.length; i += 1) {
    const ch = chapters[i];
    if (chapterFilter && !chapterFilter.has(ch.n)) continue;
    const prev = chapters[i - 1] || null;
    const next = chapters[i + 1] || null;
    const html = chapterPageHtml(ch, prev, next);
    const outPath = path.join(outDir, `ch${ch.num}.html`);
    fs.writeFileSync(outPath, html, "utf8");
    totalBytes += fs.statSync(outPath).size;
    written.push(ch.n);
    process.stdout.write(`ch${ch.num} `);
  }
  if (chapterFilter) {
    const missing = [...chapterFilter].filter((k) => !written.includes(k));
    if (missing.length) console.warn("\nNo manuscript / skipped for chapter(s):", missing.join(", "));
    if (!written.length) console.warn("\nNo chapter HTML written; index still refreshed from all manuscripts.");
  }
  const indexPath = path.join(outDir, "index.html");
  fs.writeFileSync(indexPath, indexPageHtml(chapters), "utf8");
  totalBytes += fs.statSync(indexPath).size;
  process.stdout.write(`index\n`);
  console.log(
    `Wrote ${written.length + 1} files to ${path.relative(websiteRoot, outDir)}. Total ${Math.round(totalBytes / 1024)} KB.`,
  );
}

const thisFile = path.resolve(fileURLToPath(import.meta.url));
const invokedAsCli = process.argv[1] && path.resolve(process.argv[1]) === thisFile;
if (invokedAsCli) main();
