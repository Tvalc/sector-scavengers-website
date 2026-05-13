/**
 * Image prompts for novel panel art: stage direction + verbatim beat reference.
 *
 * Each prompt is built from layered context:
 *   1. Optional per-panel `artDirective` (from <!-- art: ... --> in the markdown).
 *      When present, this fully replaces the auto scene description.
 *   2. Otherwise: a verbatim reference to the beat text (so the model draws the
 *      *action*, not just a character portrait), followed by the character
 *      bible and the setting bible.
 *   3. Optional HUD readout, framed as a screen/HUD inside the scene.
 *   4. Short shared look and print constraints in plain language (balloon margin,
 *      no lettering in the art).
 *   5. Optional soft framing sentence from the grid span, only when there is no
 *      `<!-- art: ... -->` override so we never contradict the author's shot.
 *
 * The beat text IS echoed in the prompt now (previously suppressed). The bubble
 * still carries the words for the reader, but the image model needs the action
 * directive in order to depict what is happening rather than just *who* is there.
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

function cleanInline(text) {
  if (!text) return "";
  return String(text).replace(/\s+/g, " ").trim();
}

/** Strip trailing terminal punctuation so we can wrap a clean quote and add our own period. */
function trimTerminalPunct(text) {
  return String(text).replace(/[\s.!?]+$/u, "");
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
 * Auto scene block: verbatim beat + character bible + setting bible.
 */
function autoSceneBlock({
  actionBeat,
  hudReadout,
  chapterN,
  isSys,
  isProseHud,
}) {
  const parts = [];
  const action = cleanInline(actionBeat);
  const hud = cleanInline(hudReadout);

  /* 1. What is happening in this panel. */
  if (action) {
    parts.push(`The scene should match this text from the comic: "${trimTerminalPunct(action)}."`);
  } else if (isSys && hud) {
    parts.push(
      `The scene is a floating holographic readout panel as the dominant visual, glowing softly with the lines "${trimTerminalPunct(hud)}".`,
    );
  }

  /* 2. HUD/screen content shown inside the scene, when there is also action prose. */
  if ((isSys || isProseHud) && action && hud) {
    parts.push(`A glowing screen or HUD in the scene reads "${trimTerminalPunct(hud)}".`);
  }

  /* 3. Character bible for anyone detected in the beat text. */
  const detectSource = `${action} ${hud}`.trim();
  const chars = detectCharactersInBeat(detectSource, { chapterN });
  if (chars) parts.push(chars);

  /* 4. Setting bible if anything in the beat hints at a known location. */
  const setting = detectSettingInBeat(detectSource);
  if (setting) parts.push(setting);

  return parts.join(" ");
}

/**
 * Single string to paste into an image generator: stage direction + style + composition.
 * Add your own rendering-style preset separately (brushwork, grain, color grade, line quality, medium).
 *
 * @param {object} args
 * @param {string} [args.actionBeat] - Prose beat text describing what happens in this panel.
 *                                     For code-only sys panels this is usually empty.
 * @param {string} [args.hudReadout] - Optional text shown on a HUD/screen inside the scene
 *                                     (e.g. "[SYSTEM] Good morning, Max.").
 * @param {string} [args.beat]       - Legacy single-string form; auto-split into actionBeat/hudReadout.
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
  actionBeat,
  hudReadout,
  isSys,
  isProseHud,
  artDirective,
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

  const chunks = ["Comic book panel."];

  const directive = artDirective && String(artDirective).trim();
  const hasArtDirective = Boolean(directive);
  if (directive) {
    chunks.push(directive.replace(/\s+/g, " ").trim());
  } else {
    const auto = autoSceneBlock({
      actionBeat: action,
      hudReadout: hud,
      chapterN,
      isSys,
      isProseHud,
    });
    if (auto) chunks.push(auto);
  }

  if (isSys || isProseHud) chunks.push(hudVisualHint());
  chunks.push(artDirectionLine({ isSys, isProseHud, hasArtDirective }));
  if (!hasArtDirective) chunks.push(layoutHint(span));

  return chunks.filter(Boolean).join(" ");
}
