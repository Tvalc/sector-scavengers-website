# Origin story comic: beat sheet (canonical)

Strip art comes from the Makko **Origin Story** export. A few baked files also live in `lore/origin/` for the homepage. This doc lists **panel order**, **filenames**, and **strip note copy** for the lore page `origin-story.html`.

---

## 1 `SS-Background-Origin-Story-Panel-1`

**Strip note**

In 2026 the layoffs stop pretending to be temporary.

Internal tools already draft the decks, file the tickets, and answer the standups. The all hands is short. The slide deck is long. By lunch the badge printers go quiet.

---

## 2 `SS-Background-Origin-Story-Panel-2`

**Strip note**

HR calls the packet an exit path.

Cryo sits in the same row as COBRA on a benefits table nobody reads until they are already tired. Sleep through the scarcity years, the brochure says. Wake when the world is gentle again. Initial here. Initial here. Initial here.

---

## 3 `SS-Background-Origin-Panel-3`

**Strip note**

The vaults turn into something you photograph.

Glass towers full of frost and money. Living heirs stand beside sleeping ancestors and post both like proof of lineage. Tours run on a schedule. The cold smells expensive on purpose.

---

## 4 `SS-Background-BudgetCryo-Origin-Panel-4`

**Strip note**

Scarcity does not vanish. It only learns new paperwork.

Brochure ink fades. The utopia date keeps moving. What used to be sold as a suite upgrade becomes a rated instrument, bundled, tranched, handed down to children who never asked to inherit a bill for someone else’s nap.

---

## 5 `SS-Background-Origin-Warehouse-Panel-5`

**Strip note**

Someone notices a shelf can hold a person the same way it holds a crate.

Pods stack where overflow inventory used to sit. Labels list names the way they list SKUs. The first shift supervisor treats the cold like logistics, because that is what the spreadsheet calls it.

---

## 6 `SS-Background-Origin-Warehouse-Panel-6` and `SS-Background-Origin-Warehouse-Panel-6b`

**Strip note**

The count goes wrong slowly, then all at once.

Mold in a gasket line. A coolant loop that never gets funded. Fees for power, for air, for staying asleep. The asset stays breathing. The balance climbs anyway.

**Presentation:** **6** and **6b** crossfade in one full-bleed 16:9 frame (CSS; no JS).

---

## 7 `SS-Background-Origin-ShipLoad-Panel-7`, `7b`, `7c`, `7d`

**Strip note**

**7.** A broker prints a lot that includes warm bodies still under contract.

**7b.** The winning bid carries a logo you do not recognize and a jurisdiction you cannot find on a map.

**7c.** Signatures happen in orbit where local law is mostly custom and handshake.

**7d.** The transfer stamp lands. The debt has a new owner. The people attached to it get a manifest number and a berth.

**Presentation:** four images cycle in one full-bleed 16:9 frame (no grid).

---

## 8 `SS-Background-Origin-Wakeup-Panel-8` and `SS-Background-Origin-ShipLoad-Panel-8b`

**Strip note**

**8.** Thaw alarms go off in batches. Millions sit up into the same bright UI, same total, same due date.

**8b.** Orientation is a locker combination. Training is a shrug. The suit seals. The airlock clock starts. Someone already logged you onto a salvage roster while you were still vomiting thaw gel.

**Presentation:** two images cycle in one full-bleed frame.

---

## 9 `SS-Background-Origin-SalvageRun-Panel-9`, `9b`, `9c`

**Strip note**

**9.** The bus run drops them at the junk tide line. The first wreck is a wall of bent metal and old paint.

**9b.** They burn fuel before they earn scrap. Every choice costs something you can measure.

**9c.** A few figure out the math early. Most learn it when the tank needle twitches and the hull starts talking back.

**Presentation:** three images cycle in one full-bleed frame.

---

## 10 `SS-Background-Origin-Boarding-Panel-10`, `10b`, `10c`

**Strip note**

**10.** The derelict’s mouth is a dark rectangle cut into a hull that used to belong to someone proud.

**10b.** They go through because the company channel keeps counting down and because standing still also costs money.

**10c.** The first room looks empty the way a stage looks empty before the lights come up. Then the suit readouts twitch and you hear metal settle somewhere you did not touch.

**Presentation:** three images cycle in one full-bleed frame.

---

## 11 `SS-Website-Explore-Panel`

**Strip note**

The map lies until you pay it in actions.

Some doors pay out. Some doors bill you in blood pressure and hull dents. The loot sits where something else already learned the layout.

---

## Optional beats (homepage only)

Already on the marketing home strip. Skip here or link out.

- `PlayArea` table, hand, tank readout.
- `SS-Background-Website-Panel-Smuggle` off book ledger.

---

## Filename quick reference

| Beat | File(s) |
|------|---------|
| 1 | `SS-Background-Origin-Story-Panel-1` |
| 2 | `SS-Background-Origin-Story-Panel-2` |
| 3 | `SS-Background-Origin-Panel-3` |
| 4 | `SS-Background-BudgetCryo-Origin-Panel-4` |
| 5 | `SS-Background-Origin-Warehouse-Panel-5` |
| 6 | `SS-Background-Origin-Warehouse-Panel-6`, `SS-Background-Origin-Warehouse-Panel-6b` (two frame) |
| 7 | `SS-Background-Origin-ShipLoad-Panel-7`, `7b`, `7c`, `7d` |
| 8 | `SS-Background-Origin-Wakeup-Panel-8`, `SS-Background-Origin-ShipLoad-Panel-8b` |
| 9 | `SS-Background-Origin-SalvageRun-Panel-9`, `9b`, `9c` |
| 10 | `SS-Background-Origin-Boarding-Panel-10`, `10b`, `10c` |
| 11 | `SS-Website-Explore-Panel` |

---

## Next build steps

1. Run **`npm run build:origin-media`** when the Origin Story export path is set (same rules as `build:lore`).
2. Open **`lore/origin-story.html`** via **`npm run preview`** or GitHub Pages after commit.
3. Keep **`lore/index.html`** linked to this page (Live card).
4. CSS for **6** / **6b** flip lives under `.origin-flip` in `styles.css`; multi-panel rows use `.origin-strip-quad`, `.origin-strip-triple`, `.origin-strip-pair`.
