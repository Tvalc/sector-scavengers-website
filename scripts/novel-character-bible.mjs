/**
 * Character and setting bible used to enrich novel panel art prompts.
 *
 * Edit `description` strings to refine how each character or location is drawn.
 * Aliases match against panel beat text (case-insensitive, word boundary).
 * Setting triggers match any substring in the beat text (case-insensitive).
 *
 * If a paragraph has its own `<!-- art: ... -->` directive in the markdown,
 * that directive fully replaces the auto bible content for that panel.
 *
 * NAMING NOTE
 * -----------
 * The novel was originally drafted with placeholder names (Imani, Rook, Jax,
 * Sera). The game's actual crew (Munch, Maxine, Rupert, Roger) replaces them.
 * Each renamed entry below lists both names under `aliases` so prose written
 * with old names still resolves to the correct visual description until the
 * prose rename pass is complete.
 */

export const CHARACTERS = {
  Max: {
    aliases: ["Max", "Asset #864", "#864"],
    description:
      "Max is a Black male character with warm brown skin, round cheeks, very large round dark-brown eyes, a soft curly black afro, and a small button nose. His default outfit is a light blue zip-up onesie. Do not render him as a generic white character.",
  },

  Munch: {
    aliases: ["Munch", "Imani", "Dr. Okoro", "Dr. Imani Okoro", "Okoro"],
    description:
      "Munch is the crew medic: warm brown skin, hair pulled back into short locs, sharp observant eyes, a small permanent crease between the brows from years of triage. Default outfit is a worn medic smock over dark utility pants, sleeves shoved to the elbows, one breast patch with a faded red cross. She carries a battered handheld scanner clipped to her belt. Render her with intentional character, never as a generic white woman.",
  },

  Maxine: {
    aliases: ["Maxine", "Rook", "Vasquez", "Rook Vasquez"],
    description:
      "Maxine is the rival scavenger lead: medium-brown skin, a buzzed undercut growing in unevenly, a thin scar running through one eyebrow, lean angular build. Default outfit is a scuffed salvage harness over a frayed flight jacket, mismatched gloves, knees patched with mismatched fabric. Eight small tally marks are tattooed on the inside of his forearm. Pronouns: he/him. Render him with intentional character; the name does not dictate the face.",
  },

  Rupert: {
    aliases: ["Rupert", "Jax", "Wrench", "Jax Chen", "Jax \"Wrench\" Chen"],
    description:
      "Rupert is the scrap tech: pale brown skin with sun lines, a shaved head with a faded toolshop-grease smudge near the temple they never quite wash off, calm tired eyes. Default outfit is grease-blackened coveralls with the zipper half-down, a fraying gray undershirt, a tool roll slung across the chest. Hands are always doing something with a small part. Pronouns: they/them. Render them with intentional character; the name does not dictate the face.",
  },

  Roger: {
    aliases: ["Roger", "Sera", "Sera Nix", "Nix"],
    description:
      "Roger is the analyst: light-tan skin, dark hair scraped back into a low knot, narrow rectangular smart-glasses she taps to swap overlays, sleep-bruised eyes that still read every room. Default outfit is a slate-blue Nexus contractor jacket buttoned to the throat with the corporate logo half scratched off, slim trousers, a slim data slate tucked under one arm. Pronouns: she/her. Render her with intentional character; the name does not dictate the face.",
  },

  Gwen: {
    aliases: ["Gwen"],
    description:
      "Gwen is the crew security veteran: weather-tanned skin, close-cropped silver hair, a small old burn scar along the jaw, broad shoulders carried with deliberate calm. Default outfit is a worn black tactical vest over a faded company shirt, a holstered sidearm she does not draw quickly, knuckles taped. Pronouns: she/her. She watches doorways more than faces.",
  },

  Olivia: {
    aliases: ["Olivia"],
    description:
      "Olivia is the broker: warm olive skin, slicked-back dark hair with one stubborn loose strand, neat trimmed beard, careful eyes that are always tallying. Default outfit is a once-sharp charcoal blazer over a clean undershirt, a tied silk pocket square that has seen too many cleanings, polished boots scuffed at the toe. Pronouns: he/him. Render him with intentional character; the name does not dictate the face.",
  },

  Oliver: {
    aliases: ["Oliver"],
    description:
      "Oliver is the shieldwright: deep brown skin, tight box braids tied back, shield-tech goggles pushed up on her forehead, ink-stained fingers from sketching shield diagrams in the margins of any surface within reach. Default outfit is a heavy canvas apron over a sleeveless thermal, reinforced forearm braces, a small pencil tucked behind one ear. Pronouns: she/her. Render her with intentional character; the name does not dictate the face.",
  },

  Del: {
    aliases: ["Del", "DELTA-7", "Delta-7"],
    description:
      "Del is a rogue logistics AI loaded into a humanoid maintenance shell: matte gunmetal plating with scuffed yellow safety stripes, no real face, a single thin horizontal eye-band that glows a soft amber, multi-tool fingers, an exposed cable bundle running along the spine. Posture is unnervingly still. When V.A.L.U. is in the same panel, Del orients away from her speakers. Not a human, do not draw a face.",
  },

  VALU: {
    aliases: ["V.A.L.U.", "VALU"],
    description:
      "V.A.L.U. is a disembodied corporate AI voice. If anything for V.A.L.U. appears on screen, render it as a faint friendly logo, a wall speaker, or a holographic icon, never as a body.",
  },

  Petra: {
    aliases: ["Petra", "Petra Vale", "Registrar"],
    description:
      "Petra Vale is the claims registrar: light-pink skin under fluorescent-tired pallor, a tight blonde bun, sharp angular features, eyes that miss nothing. Default outfit is a registrar's gray longcoat with stamped Nexus claim seals at the cuffs, a clipboard or datapad always in hand, a row of color-coded datachips along the lapel. Pronouns: she/her. She smiles only with the lower half of her face.",
  },

  Orin: {
    aliases: ["Orin", "Orin Bale", "Captain Bale", "Captain Orin Bale", "Helix"],
    description:
      "Captain Orin Bale is a rival corporate scavenger captain: warm beige skin, salt-and-pepper hair neatly cut, a trimmed beard, the small confident smile of someone closing a deal. Default outfit is a well-tailored captain's coat in deep maroon with a small Helix Recovery pin at the lapel, pressed shirt, polished boots. Pronouns: he/him. Render him as professionally dangerous, never cartoonishly evil.",
  },
};

export const SETTINGS = [
  {
    key: "cryoBay",
    triggers: [
      "pod",
      "cryopod",
      "cryo",
      "capsule",
      "thaw gel",
      "viewport",
      "DON'T SIGN AGAIN",
      "THEY COUNT THE WAKE-UPS",
      "Orientation Bay",
    ],
    description:
      "The location is a cryo orientation bay: cramped, industrial, six sealed cryo pods plus one open pod, ribbed steel deck slick with thaw gel, cold vapor seeping from pod seams, scratched chrome reflections, harsh practical overhead lights, frost-blind viewports.",
  },
  {
    key: "companyCorridor",
    triggers: [
      "corridor",
      "FREE WELLNESS",
      "kiosk",
      "Company posters",
      "side bay",
      "harnesses",
      "STRESS IS A CHOICE",
      "IF YOU SEE BLUE TEXT, RUN",
    ],
    description:
      "The location is a long, dim Company corridor on a derelict-era station: failing LED strips, scuffed paneling, faded corporate posters peeling at the edges, overlapping mag-boot footprints in the dust on the deck.",
  },
  {
    key: "dockRingC",
    triggers: [
      "Dock Ring C",
      "claim board",
      "claim grid",
      "auction zone",
      "armored windows",
      "CLAIM BOARD",
      "BUILD YOUR FUTURE",
      "disbursement",
      "DISBURSEMENT",
    ],
    description:
      "The location is Dock Ring C: a vast, skeletal hangar with armored windows showing drifting wrecks against a hard black starfield, a floating 4x4 hard-light claim grid hologram in the middle of the space, holo-banners, scuffed EVA workers moving in efficient arcs.",
  },
  {
    key: "skiffInterior",
    triggers: [
      "skiff",
      "canopy",
      "cockpit",
      "harness",
      "cradle",
      "SECOND CHANCE",
      "rear seat",
    ],
    description:
      "The location is the interior of a small salvage skiff: scarred and asymmetrical cockpit, three-seat layout, dented holographic controls and toggles, polarized canopy showing stars and tumbling wreckage outside.",
  },
  {
    key: "derelict",
    triggers: [
      "derelict",
      "wreck",
      "MOU---NG",
      "hull",
      "microdrone",
      "ablative",
      "tiger stripes",
    ],
    description:
      "The location is the exterior of a derelict ship being approached for salvage: broken spindle hull with puncture scars, tiger-striped ablative scorch marks, a long rip in the hull where pressure peeled metal back, debris ribbon orbiting it slowly.",
  },
];

/**
 * POV character per chapter. The POV character is implicitly assumed to be in
 * frame whenever a prose panel does not name another specific character, since
 * the chapter is rendered from their experience. Override per chapter as needed.
 */
export const CHAPTER_POV = {
  default: "Max",
};

/** Returns concatenated bible descriptions for any characters detected in `beat`. */
export function detectCharactersInBeat(beat, { chapterN } = {}) {
  if (!beat)
    return getPovCharacterBible(chapterN, /* asImplicitSubject */ true);

  const found = [];
  const seen = new Set();
  for (const [name, data] of Object.entries(CHARACTERS)) {
    for (const alias of data.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(^|[^A-Za-z0-9])${escaped}(?=$|[^A-Za-z0-9])`, "i");
      if (re.test(beat)) {
        if (!seen.has(name)) {
          seen.add(name);
          found.push(name);
        }
        break;
      }
    }
  }

  const povName = CHAPTER_POV[chapterN] || CHAPTER_POV.default;
  const pov = povName ? CHARACTERS[povName] : null;
  if (pov && !seen.has(povName)) {
    found.unshift(povName);
  }

  return found.map((n) => CHARACTERS[n].description).join(" ");
}

function getPovCharacterBible(chapterN, asImplicitSubject) {
  const povName = CHAPTER_POV[chapterN] || CHAPTER_POV.default;
  const pov = povName ? CHARACTERS[povName] : null;
  if (!pov) return "";
  if (!asImplicitSubject) return pov.description;
  return pov.description;
}

/** Returns the first matching setting bible description, or empty string. */
export function detectSettingInBeat(beat) {
  if (!beat) return "";
  const lower = beat.toLowerCase();
  for (const s of SETTINGS) {
    for (const trigger of s.triggers) {
      if (lower.includes(trigger.toLowerCase())) {
        return s.description;
      }
    }
  }
  return "";
}
