/**
 * Image prompts for novel panel art — compact, scene-first.
 *
 * Order of operations:
 *   1. Optional `<!-- art: ... -->` becomes the primary **Scene:** line (drawable staging).
 *   2. Short **Balloon/caption intent** + on-screen readout when relevant.
 *   3. One tight **character** line and one tight **setting** line (Ch.1 cryo uses
 *      short constants; other settings are word-capped).
 *   4. One-line HUD note for sys / proseHud; one-line print rules; short layout.
 *
 * The yellow balloon still carries reader-facing copy; this string is for the image model.
 *
 * Used by generate-novel-lore-pages (HTML overlay) and export-novel-art-prompts.
 */

import {
  detectCharactersInBeat,
  resolveSettingForChapter,
  SETTING_CH1_CRYO_SHORT,
} from "./novel-character-bible.mjs";

/** Bookkeeping only (not meant for the image model). */
export function buildPanelTrackingLine({ chapterN, title, panelGid, pageNum }) {
  return `Chapter ${chapterN}, ${title}, panel ${panelGid}, comic page ${pageNum}`;
}

function cleanInline(text) {
  if (!text) return "";
  return String(text).replace(/\s+/g, " ").trim();
}

function trimTerminalPunct(text) {
  return String(text).replace(/[\s.!?]+$/u, "");
}

/** Hard cap on boilerplate length so prompts stay short. */
function truncateWords(text, maxWords) {
  const t = cleanInline(text);
  if (!t) return "";
  const w = t.split(/\s+/).filter(Boolean);
  if (w.length <= maxWords) return t;
  return `${w.slice(0, maxWords).join(" ")}…`;
}

/** Long `<!-- art: -->` notes are trimmed so the prompt stays short; expand in MD if needed. */
const SCENE_DIRECTIVE_MAX_WORDS = 52;

function layoutHintCompact(span) {
  return String(span) === "12" ? "Layout: wide splash." : "Layout: tall portrait (~4:5).";
}

function printRulesOneLine() {
  return "Leave balloon margin; do not paint yellow caption/dialogue into the art.";
}

function hudSysNote() {
  return "HUD: soft glow unless this plate needs sharp readable type.";
}

/**
 * Legacy callers pass a single `beat` string. proseHud beats used to be joined
 * as "<prose> / HUD readout: <code>". Split that apart so the new builder can
 * place each part in the right slot.
 */
function splitLegacyBeat(beat) {
  const s = String(beat || "");
  const m = /^([\s\S]*?)\s*\/\s*HUD readout:\s*([\s\S]*)$/i.exec(s);
  if (m) {
    return { actionBeat: m[1].trim(), hudReadout: m[2].trim() };
  }
  return { actionBeat: s.trim(), hudReadout: "" };
}

/**
 * CORE ATTRIBUTES / “THE BLUE UI ERUPTED” merged plate — short FPV HUD brief.
 */
export function buildFirstPersonCoreAttributesHudPrompt({ hudReadout, span }) {
  const hud = truncateWords(trimTerminalPunct(cleanInline(hudReadout)), 28);
  const layout = String(span) === "12" ? "Wide; HUD dominates." : "Tall ~4:5; HUD dominates.";
  return (
    `Comic book panel. FPV: cyan HUD sheets rush toward camera; legible attribute readout in-art: "${hud}." ` +
    `Hands/forearms at bottom/sides, cyan rim light—match other Ch.1 first-person UI refs. ` +
    `No full body, no wide bay. THE BLUE UI ERUPTED is typeset in the yellow caption only, not painted. ` +
    `${layout} ${printRulesOneLine()}`
  );
}

function beatHudLines(action, hud, isSys, isProseHud) {
  const a = action ? truncateWords(trimTerminalPunct(action), 32) : "";
  const h = hud ? truncateWords(trimTerminalPunct(hud), 24) : "";
  if (a && h && (isSys || isProseHud)) {
    return `Balloon/caption intent: "${a}." On-screen readout: "${h}."`;
  }
  if (a) return `Balloon/caption intent: "${a}."`;
  if (isSys && h) return `Primary readout in-scene: "${h}."`;
  return "";
}

/**
 * @param {object} args
 * @param {boolean} [args.firstPersonHudCoreAttributes] - Ch.1 merged CORE ATTRIBUTES FPV plate.
 */
export function buildPanelArtPrompt({
  chapterN,
  title,
  panelGid,
  pageNum,
  span,
  beat,
  actionBeat,
  hudReadout,
  isSys,
  isProseHud,
  artDirective,
  firstPersonHudCoreAttributes,
}) {
  void title;
  void panelGid;
  void pageNum;

  let action = actionBeat;
  let hud = hudReadout;
  if (action === undefined && hud === undefined && beat !== undefined) {
    const split = splitLegacyBeat(beat);
    action = split.actionBeat;
    hud = split.hudReadout;
  }

  action = cleanInline(action);
  hud = cleanInline(hud);

  if (firstPersonHudCoreAttributes && hud) {
    return buildFirstPersonCoreAttributesHudPrompt({ hudReadout: hud, span });
  }

  const directive = artDirective && String(artDirective).trim();
  const detectSource = `${action} ${hud}`.trim();
  const chars = detectCharactersInBeat(detectSource, {
    chapterN,
    terseCh1Cryo: chapterN === 1,
  });
  const charLine = chars ? truncateWords(chars, chapterN === 1 ? 36 : 26) : "";

  const { key: settingKey, description: settingDesc } = resolveSettingForChapter(
    chapterN,
    detectSource,
  );
  let settingLine = "";
  if (settingDesc) {
    const raw =
      chapterN === 1 && settingKey === "cryoBay" ? SETTING_CH1_CRYO_SHORT : settingDesc;
    settingLine = truncateWords(raw, 22);
  }

  const chunks = ["Comic book panel."];
  if (directive) {
    chunks.push(
      `Scene: ${truncateWords(directive.replace(/\s+/g, " ").trim(), SCENE_DIRECTIVE_MAX_WORDS)}`,
    );
  }

  const bh = beatHudLines(action, hud, isSys, isProseHud);
  if (bh) chunks.push(bh);

  if (charLine) chunks.push(charLine);
  if (settingLine) chunks.push(settingLine);

  if (isSys || isProseHud) chunks.push(hudSysNote());
  chunks.push(printRulesOneLine());
  chunks.push(layoutHintCompact(span));

  return chunks.filter(Boolean).join(" ");
}
