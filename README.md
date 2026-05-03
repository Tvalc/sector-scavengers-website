# Sector Scavengers — marketing site

Static HTML/CSS/JS. Deploy to **GitHub Pages** with the included workflow.

## One-time setup

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

## Refresh hero videos from the redo export

```bash
npm run sync:hero-videos
```

(Edit `scripts/sync-hero-videos.mjs` if the source `Videos` path moves.)

## Monorepo note

If this site lives in a subfolder of a larger repo, change the `path:` in `.github/workflows/deploy-pages.yml` to that subfolder (e.g. `sector-scavengers-website`) and keep the workflow file under `.github/workflows` at the **monorepo root**, not inside the site folder.
