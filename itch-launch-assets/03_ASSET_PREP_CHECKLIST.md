# Asset prep checklist: Steam to itch.io

The Steam page already has every visual asset you need. This file maps each Steam asset to an itch.io slot with the crop spec.

## Mapping table

| itch.io slot              | Required size       | Source from Steam              | Crop note                                                       |
|---------------------------|---------------------|--------------------------------|-----------------------------------------------------------------|
| Cover image               | 630 x 500           | Library Capsule (600 x 900)    | Crop to roughly square. Subject in center third. Title legible. |
| Banner (optional)         | 920 x 280           | Steam Header (920 x 430)       | Crop vertically. Keep title centered.                           |
| Screenshots (6 to 8)      | 1920 x 1080         | Steam screenshots              | Reuse directly.                                                 |
| GIFs (3)                  | Under 3 MB each     | Existing Steam GIFs            | Re-export at 720p, 12 fps if any GIF exceeds 3 MB.              |
| Trailer                   | YouTube URL         | Steam trailer's YouTube mirror | Re-upload to YouTube or Vimeo if Steam-only.                    |

## Folder structure (local staging)

Stage everything under a single folder before upload. Suggested structure:

```
sector-scavengers-website/itch-launch-assets/media/
  cover-630x500.png
  banner-920x280.png
  screens/
    01-card-play.png
    02-hull-pressure.png
    03-push-or-leave.png
    04-economy-payoff.png
    05-build-variety.png
    06-corporate-tone.png
    07-void-xp.png
    08-map-depth.png
  gifs/
    A-card-choice-to-hull.gif
    B-extract-decision.gif
    C-declared-vs-smuggled.gif
  trailer-url.txt
```

Keep originals separate from re-crops in a `media/_originals/` subfolder so a bad crop never overwrites the source.

## Screenshot order

Itch.io readers skim the first 4 thumbnails. Put your strongest reads first:

1. Core card play with hand, energy meter, and a clear consequence.
2. Hull / danger / escalating tension.
3. Push-or-leave decision (extract button next to a deeper-room option).
4. Economy payoff screen (declared vs. smuggled).
5. Build variety / unlock / different tactic.
6. Tone / corporate-satire UI slice.
7. Void XP / progression screen.
8. Map depth reveal.

## GIF spec

- Under 3 MB per file (itch will still accept larger, but in-page playback stutters).
- 720p maximum, 12 fps is usually enough for card-UI motion.
- Loop cleanly. No black flash at the end of the loop.
- Each GIF should make sense without sound and without context, since itch users hover-scrub.

## Trailer

- itch.io embeds YouTube and Vimeo URLs only. It does not embed Steam-hosted video.
- Verify the YouTube URL is set to **Public** or **Unlisted**, not Private.
- Drop the URL into the media gallery and reorder so it is the first item shown.

## Cover image notes

- Avoid putting key text in the bottom 20% of the cover; itch overlays the title text on the home grid for some browse views.
- Avoid heavy red-on-cyan combos that crush at 315 x 250 thumbnail size.
- Test the cover at 315 x 250 before locking. Squint test: can you still read the genre at a glance?
