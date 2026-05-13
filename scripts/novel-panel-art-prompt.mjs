/**
 * Image prompts for novel panel art: stage direction, not caption echo.
 *
 * Each prompt is built from layered context:
 *   1. Optional per-panel `artDirective` (from <!-- art: ... --> in the markdown).
 *      When present, this fully replaces the auto scene description.
 *   2. Otherwise: character bible + setting bible, auto-detected from the beat text.
 *   3. Short shared look and print constraints in plain language (balloon margin, no lettering in art).
 *   4. Optional soft framing sentence from the grid span, only when there is no `<!-- art: ... -->` override
 *      so we never contradict the author's shot.
 *
 * The caption text itself is intentionally NOT echoed in the prompt. The bubble
 * already carries the words; the prompt should describe what to draw.
 *
 * Rendering medium (brush, grain, painterly vs clean line, exact palette) is
 * left to your generator preset.
 *
 * Used by generate-novel-lore-pages (HTML overlay) and export-novel-art-prompts.
 */

import {
  detectCharactersInBeat,
  detectSettingInBeat,
} from "./novel-character-bible.mjs";

/** Bookkeeping only (not meant for the image model). */
export function buildPanelTrackingLine({ chapterN, title, panelGid, pageNum }) {
  return `Chapter ${chapterN}, ${title}, panel ${panelGid}, comic page ${pageNum}`;
}

/** Soft framing hint when there is no per-panel override (override text already implies shot). */
function layoutHint(span) {
  if (String(span) === "12") {
    return "Framing feels like a wide movie still: you can read the room in one look.";
  }
  return "Framing feels like a tall comic panel: figure and background both read clearly.";
}

function hudVisualHint() {
  return "If there is a HUD, keep it as soft glow, simple shapes, and a few symbols, not a wall of tiny readable text.";
}

/**
 * Shared look and print constraints, in plain language.
 * When the author supplied `<!-- art: ... -->`, we keep this short so it does not
 * drown out their scene description with jargon.
 */
function artDirectionLine({ isSys, isProseHud, hasArtDirective }) {
  const base = hasArtDirective
    ? "Near-future sci-fi, lived-in metal and plastic, harsh practical light. Leave a little empty margin where speech balloons can go later. Do not draw dialogue or captions inside the image."
    : "Near-future sci-fi that feels grounded and lived-in: worn metal, cable runs, cold vapor, harsh practical lights. You can read the main shapes at a glance. Leave a little empty margin where speech balloons can go later. Do not draw dialogue or captions inside the image.";
  if (isSys || isProseHud) {
    return `${base} Any screen glow or HUD stays loose and abstract, not micro-legible blocks.`;
  }
  return base;
}

/** Auto scene block from character + setting bibles. Returns "" if nothing matches. */
function autoSceneBlock(beat, { chapterN, isSys, isProseHud }) {
  if (isSys && !isProseHud) {
    return "In frame: a floating holographic readout panel as the dominant visual, no characters required unless the beat names one.";
  }
  const parts = [];
  const chars = detectCharactersInBeat(beat || "", { chapterN });
  if (chars) parts.push(`In frame: ${chars}`);
  const setting = detectSettingInBeat(beat || "");
  if (setting) parts.push(setting);
  return parts.join(" ");
}

/**
 * Single string to paste into an image generator: stage direction + style + composition.
 * Add your own rendering-style preset separately (brushwork, grain, color grade, line quality, medium).
 *
 * @param {object} args
 * @param {string} [args.artDirective] - Optional plain-English scene description from a
 *                                       `<!-- art: ... -->` comment attached to this panel's paragraph.
 *                                       When set, replaces the auto character + setting block.
 */
export function buildPanelArtPrompt({
  chapterN,
  title,
  panelGid,
  pageNum,
  span,
  beat,
  isSys,
  isProseHud,
  artDirective,
}) {
  void title;
  void panelGid;
  void pageNum;

  const chunks = ["Comic book panel."];

  const directive = artDirective && String(artDirective).trim();
  const hasArtDirective = Boolean(directive);
  if (directive) {
    chunks.push(directive.replace(/\s+/g, " ").trim());
  } else {
    const auto = autoSceneBlock(beat, { chapterN, isSys, isProseHud });
    if (auto) chunks.push(auto);
  }

  if (isSys || isProseHud) chunks.push(hudVisualHint());
  chunks.push(artDirectionLine({ isSys, isProseHud, hasArtDirective }));
  if (!hasArtDirective) chunks.push(layoutHint(span));

  return chunks.filter(Boolean).join(" ");
}
