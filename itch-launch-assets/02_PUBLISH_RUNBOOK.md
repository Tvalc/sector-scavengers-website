# itch.io publish runbook

Every field, in order, with the exact value to enter. Numbered so you can stop at any checkpoint and resume later. Source of truth for paste-ready copy is `01_PAGE_DESCRIPTION.md`.

## Pre-flight

1. Have an itch.io account in the public-facing name.
2. Pin your itch.io profile URL (e.g. `tonyvalcarcel.itch.io`).
3. Keep the Steam page URL on a clipboard manager: `https://store.steampowered.com/app/4541430/Sector_Scavengers_Signal__Salvage/`

## Step 1, create the project shell (Draft)

1. Top-right avatar, then **Upload new project**.
2. **Title:** `Sector Scavengers: Signal & Salvage`
3. **Project URL:** `sector-scavengers-signal-and-salvage`
4. **Short description / tagline:** `Salvage roguelite. Three cards in hand, debt on the clock, hull metal screaming.`
5. **Classification:** `Games`
6. **Kind of project:** `HTML`
7. **Release status:** `Prototype` (flip to `In Development` once the loop is stable)
8. **Pricing:** `$0 or donate`. Primary `$0`. Donations off unless you want them on.
9. Save as Draft. Do not upload the build yet.

## Step 2, page art

1. **Cover image:** 630 x 500. Designed at 1260 x 1000 for retina. Crop from Steam Library Capsule (600 x 900). Subject in center third.
2. **Banner (optional):** 920 x 280. Crop vertically from the Steam header (920 x 430). Skip if not ready, the page still works.

## Step 3, description body

1. Toggle editor to **Markdown** (button near the description box).
2. Paste the body from `01_PAGE_DESCRIPTION.md` between the START / END markers, verbatim.
3. Spot-check links: Steam, Makko AI homepage, Makko devlog.

## Step 4, media gallery

1. Upload 6 to 8 screenshots in this order:
   1. Core card play (hand + energy + clear consequence)
   2. Hull / danger / escalating tension
   3. Push-or-leave decision (extract next to deeper-room option)
   4. Economy payoff (declared vs. smuggled numbers)
   5. Build variety / unlock / different tactic
   6. Tone / corporate-satire UI slice
   7. Void XP / progression screen
   8. Map depth reveal
2. Upload 3 GIFs, each under 3 MB:
   - GIF A: card choice -> hull damage tick.
   - GIF B: extract decision (hover extract vs. deeper room).
   - GIF C: economy split (declared vs. smuggled numbers populating).
3. Paste the Steam trailer URL (YouTube). Reorder so the trailer is the **first** media item.

## Step 5, metadata sidebar

- **Genre:** `Card Game`
- **Tags:** `roguelike`, `deckbuilder`, `deck-building`, `roguelite`, `sci-fi`, `space`, `extraction`, `push-your-luck`, `dark-humor`, `singleplayer`, `atmospheric`, `tactical`, `indie`, `replay-value`, `2d`
- **Made with:** `Makko AI`
- **Average session:** `About an hour`
- **Inputs:** `Mouse`, `Keyboard`
- **Languages:** `English`
- **Accessibility:** select only what truly applies.
- **AI generation disclosure:** set to "Contains AI-generated content" and paste the disclosure copy from `07_NOTES_AND_FLAGS.md`.

## Step 6, upload the demo build

1. Zip the demo so `index.html` is at the **root** of the zip. No nested folder wrapping it. Itch rejects nested roots.
2. Upload the zip on the project page.
3. Tick **"This file will be played in the browser"**.
4. Embed options:
   - **Viewport dimensions:** `1280 x 720` (or the build's actual native canvas).
   - **Fullscreen button:** ON.
   - **Mobile friendly:** OFF (desktop card game).
   - **Frame options:** default. Set to `Click to launch in fullscreen` only if the embed runs heavy.
5. Save.

## Step 7, smoke test (Draft)

1. View the page as a logged-in editor.
2. Play the embed end-to-end. Confirm:
   - No broken sprites.
   - No console errors visible.
   - Save resumes after refresh.
   - Fullscreen works.
3. Visit the page on a phone. The page itself should render even though the game embed is desktop only.

## Step 8, restricted launch (press week, 7 days before public)

1. Set page visibility to **Restricted**.
2. Send 5 to 10 DMs using `05_OUTREACH_BLURB.md`.
3. Watch comments and feedback. Fix anything that is blocking.

## Step 9, public launch

1. Flip page to **Public**.
2. Publish the devlog from `04_LAUNCH_DEVLOG_POST.md`.
3. Cross-post on Steam announcements and any social you use.
4. Add a secondary line on the marketing site's wishlist CTA: "Play the demo free on itch.io".

## Checkpoints

- End of Step 5: page is presentable as a Draft preview. Send to yourself only.
- End of Step 7: Restricted-ready. Internal QA done.
- End of Step 9: Public. Devlog live. Outreach round 2 sent.
