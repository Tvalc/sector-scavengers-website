/**
 * Makko / Rift Runners-style examples (NOT the Sector Scavengers marketing site).
 * Serves: ../Makko_Showcase_Game_Plan/web_example → default http://127.0.0.1:4175/
 * For SS site use: npm run preview  or  npm run preview:sector-scavengers
 */
process.env.PREVIEW_ROOT = "../Makko_Showcase_Game_Plan/web_example";
process.env.PORT = process.env.PORT || "4175";
process.env.PREVIEW_HINT = `Pixel gallery: http://127.0.0.1:${process.env.PORT}/pixel-art-concept-gallery.html`;
await import(new URL("./preview.mjs", import.meta.url));
