/**
 * Reads lore/novel/ch*.html and writes per-panel image prompts for AI art tools.
 * Usage: node scripts/export-novel-art-prompts.mjs [01|ch01]   (optional: one chapter only)
 * Output: lore/novel/art-prompts/chNN-art-prompts.md
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildPanelArtPrompt, buildPanelTrackingLine } from "./novel-panel-art-prompt.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(__dirname, "..");
const novelHtmlDir = path.join(websiteRoot, "lore", "novel");
const outDir = path.join(novelHtmlDir, "art-prompts");

function decodeHtml(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripTags(s) {
  return decodeHtml(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function spanFromClasses(classStr) {
  if (classStr.includes("novel-panel--span-12")) return "12";
  if (classStr.includes("novel-panel--span-8")) return "8";
  if (classStr.includes("novel-panel--span-6")) return "6";
  if (classStr.includes("novel-panel--span-4")) return "4";
  if (classStr.includes("novel-panel--span-3")) return "3";
  return "?";
}

function aspectBlock(span) {
  if (span === "12") {
    return "**Layout:** wide splash (~2:1 landscape). One strong establishing image; leave lower third relatively open for balloon overlay in post.";
  }
  return "**Layout:** vertical tier panel (~4:5 portrait). Tight readable focal; leave margin for balloon overlay in post.";
}

function extractBeatParts(articleInner, isSys, hudReadoutOverride) {
  if (isSys && hudReadoutOverride) {
    const balloonMatch = /<blockquote[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/.exec(articleInner);
    const balloon = balloonMatch ? stripTags(balloonMatch[1]) : "";
    return { actionBeat: balloon, hudReadout: hudReadoutOverride };
  }
  if (isSys) {
    const codeMatch = /<pre class="novel-panel__sys"><code>([\s\S]*?)<\/code><\/pre>/.exec(articleInner);
    const balloonMatch = /<blockquote[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/.exec(articleInner);
    const balloon = balloonMatch ? stripTags(balloonMatch[1]) : "";
    const hud = codeMatch ? decodeHtml(codeMatch[1]).trim() : "";
    return { actionBeat: balloon, hudReadout: hud };
  }
  const inFig = /<pre class="novel-panel__sys novel-panel__sys--in-figure"><code>([\s\S]*?)<\/code><\/pre>/.exec(
    articleInner,
  );
  const balloonMatch = /<blockquote[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/.exec(articleInner);
  const balloon = balloonMatch ? stripTags(balloonMatch[1]) : "";
  if (inFig) {
    return { actionBeat: balloon, hudReadout: decodeHtml(inFig[1]).trim() };
  }
  return { actionBeat: balloon, hudReadout: "" };
}

function beatSummaryForDocs({ actionBeat, hudReadout }) {
  if (actionBeat && hudReadout) return `${actionBeat} / HUD readout: ${hudReadout}`;
  return actionBeat || hudReadout || "(no text)";
}

function chapterTitleFromHtml(html) {
  const m = /<h1[^>]*id="strip-page-title"[^>]*>([^<]+)<\/h1>/.exec(html);
  return m ? stripTags(m[1]) : "Novel chapter";
}

function extractPanels(html) {
  const panels = [];
  const sectionRe = /<section class="novel-comic-page" id="novel-page-(\d+)"[^>]*>([\s\S]*?)<\/section>/g;
  let sm;
  while ((sm = sectionRe.exec(html)) !== null) {
    const pageNum = sm[1];
    const sectionBody = sm[2];
    const artRe =
      /<article class="([^"]*)" id="(novel-p\d+)"([^>]*)>([\s\S]*?)<\/article>/g;
    let am;
    while ((am = artRe.exec(sectionBody)) !== null) {
      const classStr = am[1];
      const id = am[2];
      const articleAttrs = am[3];
      const inner = am[4];
      const span = spanFromClasses(classStr);
      const isSys = classStr.includes("novel-panel--sys");
      const isProseHud = classStr.includes("novel-panel--prose-hud");
      const readoutOnArt = classStr.includes("novel-panel--readout-on-art");
      let hudFromAttr = "";
      if (readoutOnArt && isSys) {
        const mHud = /data-novel-hud-readout="([^"]*)"/.exec(articleAttrs);
        if (mHud) {
          try {
            hudFromAttr = decodeURIComponent(mHud[1]);
          } catch {
            hudFromAttr = "";
          }
        }
      }
      const { actionBeat, hudReadout } = extractBeatParts(inner, isSys, hudFromAttr);
      panels.push({
        pageNum,
        id,
        span,
        isSys,
        isProseHud,
        actionBeat,
        hudReadout,
        readoutOnArt,
      });
    }
  }
  return panels;
}

function promptForPanel(chapterN, title, p) {
  const panelGid = /^novel-p(\d+)$/.exec(p.id)?.[1] ?? p.id.replace(/^novel-p/, "");
  return buildPanelArtPrompt({
    chapterN,
    title,
    panelGid,
    pageNum: p.pageNum,
    span: p.span,
    actionBeat: p.actionBeat || "",
    hudReadout: p.hudReadout || "",
    isSys: p.isSys,
    isProseHud: p.isProseHud,
    firstPersonHudCoreAttributes: Boolean(p.isSys && p.readoutOnArt && p.hudReadout),
  });
}

function trackingForPanel(chapterN, title, p) {
  const panelGid = /^novel-p(\d+)$/.exec(p.id)?.[1] ?? p.id.replace(/^novel-p/, "");
  return buildPanelTrackingLine({ chapterN, title, panelGid, pageNum: p.pageNum });
}

function padChapter(n) {
  return String(n).padStart(2, "0");
}

function main() {
  const arg = (process.argv[2] || "").trim();
  const m = arg.match(/^(?:ch)?(\d{1,2})$/i);
  const filter = m ? m[1].padStart(2, "0") : null;

  if (!fs.existsSync(novelHtmlDir)) {
    console.error("Missing", novelHtmlDir);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs
    .readdirSync(novelHtmlDir)
    .filter((f) => /^ch\d{2}\.html$/i.test(f))
    .filter((f) => !filter || f.toLowerCase() === `ch${filter}.html`)
    .sort();

  if (!files.length) {
    console.error("No ch*.html files found", filter ? `(filter: ${filter})` : "");
    process.exit(1);
  }

  for (const file of files) {
    const n = parseInt(/^ch(\d{2})\.html$/i.exec(file)[1], 10);
    const pad = padChapter(n);
    const html = fs.readFileSync(path.join(novelHtmlDir, file), "utf8");
    const title = chapterTitleFromHtml(html);
    const panels = extractPanels(html);

    const lines = [
      `# Debt Protocol · Chapter ${n} · ${title}`,
      ``,
      `**File:** \`media/novel/ch${pad}-pNN.png\` (match \`NN\` to panel id, e.g. \`novel-p12\` → \`ch${pad}-p12.png\`).`,
      ``,
      `## How to use these prompts`,
      `1. Copy the **Full prompt** for one panel into your image model as the **scene + art direction** positive (action, environment, lighting intent, readability, and framing).`,
      `2. Add **rendering medium and look** yourself—brush style, film grain, painterly vs clean line, palette, and any extra “no text” reinforcement—in a preset or a second positive block.`,
      `3. Match aspect ratio to **Layout** (wide splash vs tall tier).`,
      `4. Keep speech balloons off the render if you composite them in post; the site supplies balloon text separately.`,
      ``,
      `---`,
      ``,
    ];

    for (const p of panels) {
      lines.push(
        `## ${p.id} · page ${p.pageNum} · span-${p.span}${p.isSys ? " · UI readout" : ""}${p.isProseHud ? " · HUD in frame" : ""}`,
      );
      lines.push("");
      lines.push(aspectBlock(p.span));
      lines.push("");
      lines.push("**Beat / copy (for you, not necessarily on the art):**");
      lines.push("");
      lines.push("```");
      lines.push(beatSummaryForDocs({ actionBeat: p.actionBeat, hudReadout: p.hudReadout }));
      lines.push("```");
      lines.push("");
      lines.push("**Full prompt (paste into generator as one block):**");
      lines.push("");
      lines.push(promptForPanel(n, title, p));
      lines.push("");
      lines.push("**Tracking (for filenames / sheets, not part of the image prompt):**");
      lines.push("");
      lines.push(trackingForPanel(n, title, p));
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    const outPath = path.join(outDir, `ch${pad}-art-prompts.md`);
    fs.writeFileSync(outPath, lines.join("\n"), "utf8");
    console.log("Wrote", panels.length, "panels →", path.relative(websiteRoot, outPath));
  }

  console.log("Done →", path.relative(websiteRoot, outDir));
}

main();
