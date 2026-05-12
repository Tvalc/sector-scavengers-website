# Sector Scavengers, marketing site

Static HTML/CSS/JS. Deployed with **GitHub Pages** (GitHub Actions).

**Live site:** https://tvalc.github.io/sector-scavengers-website/

Large **`.mp4`** files are tracked with **Git LFS** (GitHub rejects blobs over 100MB without it). Install [Git LFS](https://git-lfs.com/) and run `git lfs install` before cloning if videos are missing locally.

## One-time setup (already done for this repo)

1. **Create a new empty repository** on GitHub (e.g. `sector-scavengers-website`). Do not add a README if you will push this folder as the root.

2. **Use this folder as the repo root** (copy or init git here so `index.html` is at the repository root).

3. **Push to `main`:**

   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

4. In the repo on GitHub: **Settings → Pages → Build and deployment**.

   - **Source:** GitHub Actions (not “Deploy from a branch”).

5. Open **Actions** and confirm the **Deploy GitHub Pages** workflow succeeded.

Your site will be at:

`https://YOUR_USER.github.io/YOUR_REPO/`

(If the repo is named `YOUR_USER.github.io`, Pages serves from the root domain `https://YOUR_USER.github.io/`.)

## Local preview

```bash
npm run preview
```

Then open `http://127.0.0.1:4173/`.

### Lore / origin comic PNGs (home page strip)

The prologue and “Laws of the loop” panels load **only** from this folder (repo root):

`lore/origin/`

**Get the NEW strip on disk (one command):** put the six PNGs in **`lore/origin-source/`** (same repo, folder next to `origin/`) with the **exact names** in the table below — *or* leave them in your Makko **Backgrounds/Backgrounds** export if that path still exists — then run:

```bash
npm run build:lore
```

That writes **`lore/origin/*.png`** (max width 2200px) **and** matching **`lore/origin/*.webp`** for faster loads. The site uses **WebP first** with **PNG fallback** (`<picture>`).

If your redo export is on disk next to this repo as **`..\Sector-Scavengers-SS-Redo\<stamp>\Sector Scavengers\Lore\Origin Story`** (for example `sector-scavengers-2026-04-30T1144`), **`npm run build:lore`** picks that folder automatically—no `LORE_SRC` needed. If you add a newer `<stamp>` folder, the script tries the newest name first.

If your art lives under **`Sector Scavengers\Lore\Origin Story`** inside **`sector-scavengers`** instead, that path is also checked.

**Or** point at any folder on your machine:

```bash
# PowerShell
$env:LORE_SRC="C:\full\path\to\Origin Story"; npm run build:lore
```

**Exact filenames** (all `.png`; GitHub Pages is case-sensitive—use lowercase `.png`):

| File |
|------|
| `SS-Background-Origin-Story-Panel-1.png` |
| `SS-Background-Origin-Warehouse-Panel-6b.png` |
| `SS-Background-Origin-ShipLoad-Panel-8b.png` |
| `PlayArea.png` |
| `SS-Website-Explore-Panel.png` |
| `SS-Background-Website-Panel-Smuggle.png` |

If the smuggle panel is not in your **Origin Story** folder, add that file under the same name to **Origin Story**, **`lore/origin-source/`**, or your `LORE_SRC` folder so `build:lore` can copy it; otherwise that panel is skipped and the old `generated/` fallback still applies.

If these files are missing from the repo, the page **still shows** the older `generated/*.webp` placeholders (via `site.js`) until you add the PNGs, **commit**, and push. Putting art only on your machine outside this folder (or only in another repo) will not update the live site.

**Strip still blank and `generated/` empty locally?** The home page also falls back to baked art under `generated/*.webp` (from `npm run build:site-assets`). That script expects the Makko export `Backgrounds/Backgrounds` path in `scripts/bake-site-backgrounds.mjs`—adjust `BG_DIR` if your export lives elsewhere, then run:

```bash
npm run build:site-assets
```

**Videos look broken (black feed, spinner, or Codec error)?** Large `.mp4` files live in **Git LFS**. If they were never fetched, disk only has tiny **pointer text files** (about 130 bytes), not video, the hero `<video>` still requests them, but browsers cannot decode that. Fix:

```bash
git lfs install
git lfs pull
```

The preview script also prints a reminder on startup when it detects LFS pointers instead of real media.

## Refresh hero videos from the redo export

```bash
npm run sync:hero-videos
```

(Edit `scripts/sync-hero-videos.mjs` if the source `Videos` path moves.)

## Monorepo note

If this site lives in a subfolder of a larger repo, change the `path:` in `.github/workflows/deploy-pages.yml` to that subfolder (e.g. `sector-scavengers-website`) and keep the workflow file under `.github/workflows` at the **monorepo root**, not inside the site folder.
