# Notes and flags

Open items, disclosure copy, and things to verify before flipping the page to Public.

## 1. The 3-hour soft cap

Not in the current `Sector-Scavengers-SS-Redo` build. Needs:

- A session timer that accrues active play time (paused while tab is hidden).
- A lockout screen at 3:00:00 that says: "Demo session limit reached. Wishlist on Steam for the full release."
- A "Reset session" control on the lockout screen that wipes the timer (not the save).
- A small live counter visible in a corner of the HUD: `02:14 / 3:00`.

This is a single drop-in script. When you green-light Week 2, I will write it.

## 2. AI disclosure copy (paste into itch's AI generation field)

Itch.io added the **"This project contains the output of generative AI"** field in 2024. Disclosure is not optional. Paste this into the disclosure box:

```
Art and game logic built using Makko AI (https://www.makko.ai), an AI 2D game studio.
No drawing or coding required. Style locked once via Makko Collections so every character,
environment, and UI element stays visually consistent across the full build.
```

## 3. Trailer hosting

itch.io embeds YouTube and Vimeo only. It does not embed Steam-hosted video.

- Confirm the Steam trailer is also live on YouTube (Public or Unlisted).
- If it isn't, re-upload before Week 3.

## 4. Steam linking rules (already enforced)

- itch description body **can** link to Steam. We already do, twice.
- Steam description body **cannot** link to itch (Steam policy). Use Steam's official link fields if you need an outbound link.
- This separation is already in place across the marketing site and Steam copy.

## 5. Save state behavior

- Save lives in `localStorage`.
- Clearing cookies or running in Private/Incognito wipes the run.
- The description already mentions this. Add an in-game "Clear save" control to make testing easier for streamers.

## 6. Things I am not auto-creating

- The cover image and banner crops. Those need source files I do not have access to. Asset specs are in `03_ASSET_PREP_CHECKLIST.md`.
- The actual itch.io account. You create that under the brand name you want public.
- The demo build itself. Will package once Week 2 lands.

## 7. Voice rules baked into every paste-ready file

- No em dashes.
- No "straightforward," "genuinely," "honestly."
- "Makko AI" only, never Macco / Maco / MCO.
- CTA buttons: background `#3b8edf`, white text `#ffffff`. Inline links: `#3b8edf`.
- Tone matches the marketing site and Steam page: short sentences, corporate-satire framing, no hub mechanics promised that the current build doesn't actually have.

## 8. Open questions for you

1. Itch.io account name / profile URL: locked or still picking?
2. Do you want donations on or off on the page? (Default in the runbook is OFF.)
3. Any streamers / press contacts you want me to draft personalized openers for, instead of using the generic blurb?
4. Do you want me to write the 3-hour soft cap script now (so it's ready for Week 2), or wait until you green-light Week 2?
