# 1-month timeline

Quality over speed, no fixed launch date, target window: ~30 days from today. Each week ends at a clean checkpoint so the launch is never blocked on one item.

## Week 1, page shell

Goal: itch.io page exists as a Draft with every text field, metadata, and link finalized. No build uploaded yet.

- [ ] Create itch.io account and profile URL.
- [ ] Create project shell using `02_PUBLISH_RUNBOOK.md` Steps 1 through 5.
- [ ] Paste description from `01_PAGE_DESCRIPTION.md`.
- [ ] Fill metadata sidebar verbatim from the runbook.
- [ ] Set page visibility to **Draft**.
- [ ] Send Draft URL to yourself only. Read the page from a fresh browser.

**Checkpoint:** the page reads correctly without the game embed.

## Week 2, build prep

Goal: demo build is feature-locked, 3-hour soft cap implemented, packaged as a clean HTML5 zip.

- [ ] Implement 3-hour session soft cap (timer + lockout screen + reset path). See `07_NOTES_AND_FLAGS.md` item 1.
- [ ] Implement save-resume against `localStorage` with a visible "Clear save" control.
- [ ] Confirm `index.html` is at the root of the zip. No nested folder.
- [ ] Smoke test the build offline. Open the unzipped `index.html` directly. It must run with no server.
- [ ] Smoke test in Chrome, Firefox, Safari.

**Checkpoint:** zip is small enough to upload to itch (well under 1 GB), `index.html` at root, runs in 3 browsers.

## Week 3, build upload and restricted launch

Goal: build is uploaded to itch, embed works, page flips to **Restricted** for press week.

- [ ] Upload zip per `02_PUBLISH_RUNBOOK.md` Step 6.
- [ ] Run the smoke test from Step 7.
- [ ] Set page visibility to **Restricted**.
- [ ] Send 5 to 10 outreach DMs using `05_OUTREACH_BLURB.md`.
- [ ] Open the page on a fresh, logged-out browser using the restricted URL. Confirm it loads.

**Checkpoint:** outsiders can play the demo via the restricted URL.

## Week 4, public launch

Goal: page flips Public, devlog is live, marketing site cross-links the demo.

- [ ] Address any blocking feedback from press week.
- [ ] Flip page visibility to **Public**.
- [ ] Publish devlog from `04_LAUNCH_DEVLOG_POST.md`. Pin for 7 days.
- [ ] Add "Play the demo free on itch.io" line on the marketing site's wishlist CTA section.
- [ ] Cross-post a Steam announcement that points to the demo (Steam allows linking from the announcement, not from the store description body).
- [ ] Open itch comments daily for the first 7 days. Reply to every legitimate bug report.

**Checkpoint:** page is live, devlog is pinned, demo is playable in browser, comments active.

## Don't-blockers

If any item slips, here's what's allowed to slide vs. what is not:

- **Can slide:** banner image, third GIF, Average Session field, Accessibility field.
- **Cannot slide:** cover image, working embed, Steam wishlist link in the body, AI disclosure, 3-hour soft cap.
