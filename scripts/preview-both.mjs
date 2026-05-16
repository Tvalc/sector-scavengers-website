/**
 * Run Sector Scavengers + Makko web_example previews together (fixed ports).
 *   SS:    http://127.0.0.1:4173/
 *   Makko: http://127.0.0.1:4175/
 * Ctrl+C stops both.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, "preview.mjs");

const ssPort = process.env.SS_PREVIEW_PORT || "4173";
const makkoPort = process.env.MAKKO_PREVIEW_PORT || "4175";

const ssEnv = { ...process.env, PORT: ssPort };
delete ssEnv.PREVIEW_ROOT;
delete ssEnv.PREVIEW_HINT;

const mkEnv = {
  ...process.env,
  PORT: makkoPort,
  PREVIEW_ROOT: "../Makko_Showcase_Game_Plan/web_example",
  PREVIEW_HINT: `Pixel gallery: http://127.0.0.1:${makkoPort}/pixel-art-concept-gallery.html`,
};

function start(label, env) {
  return spawn(process.execPath, [script], {
    env,
    stdio: "inherit",
    windowsHide: true,
  });
}

console.log(
  [
    "Starting two previews (Ctrl+C stops both):",
    `  Sector Scavengers → http://127.0.0.1:${ssPort}/  |  http://localhost:${ssPort}/`,
    `  Makko / Rift examples → http://127.0.0.1:${makkoPort}/  |  http://localhost:${makkoPort}/`,
    "",
  ].join("\n"),
);

const ss = start("ss", ssEnv);
const mk = start("makko", mkEnv);

function shutdown() {
  ss.kill("SIGTERM");
  mk.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

ss.on("exit", (code, sig) => {
  if (code !== 0 && code !== null) {
    console.error(`Sector Scavengers preview exited (${code}${sig ? ` ${sig}` : ""}). Check port ${ssPort}.`);
    if (!mk.killed) mk.kill("SIGTERM");
  }
});
mk.on("exit", (code, sig) => {
  if (code !== 0 && code !== null) {
    console.error(`Makko examples preview exited (${code}${sig ? ` ${sig}` : ""}). Check port ${makkoPort}.`);
  }
  if (code !== 0 && !ss.killed) ss.kill("SIGTERM");
});
