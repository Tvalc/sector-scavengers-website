/**
 * Minimal static server (Node only), avoids Windows EMFILE issues seen with
 * `npx serve` when the hero <video> triggers many ranged MP4 reads.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Default: repo root. Set `PREVIEW_ROOT` to a path relative to the repo root to serve another folder (e.g. `../Makko_Showcase_Game_Plan/web_example`). */
const ROOT = process.env.PREVIEW_ROOT
  ? path.resolve(__dirname, "..", process.env.PREVIEW_ROOT)
  : path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 4173;
/** `::` + `ipv6Only: false` fixes many Windows setups where `localhost` resolves to IPv6 first. Override with `PREVIEW_HOST=0.0.0.0` or `127.0.0.1` if needed. */
const LISTEN_HOST = process.env.PREVIEW_HOST || "::";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webmanifest": "application/manifest+json",
};

function resolveFile(urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  if (rel === "" || rel.endsWith("/")) rel = rel + "index.html";
  rel = rel.split("/").join(path.sep);
  const full = path.resolve(ROOT, rel);
  const relToRoot = path.relative(ROOT, full);
  if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) return null;
  return full;
}

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  let start = m[1] === "" ? 0 : parseInt(m[1], 10);
  let end = m[2] === "" ? size - 1 : parseInt(m[2], 10);
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return null;
  if (end >= size) end = size - 1;
  return [start, end];
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end();
    return;
  }

  const url = new URL(req.url || "/", "http://127.0.0.1");
  const filePath = resolveFile(url.pathname);
  if (!filePath) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, st) => {
    let fp = filePath;
    let stUse = st;
    if (!err && st.isDirectory()) {
      fp = path.join(filePath, "index.html");
      try {
        stUse = fs.statSync(fp);
      } catch {
        res.writeHead(404).end("Not found");
        return;
      }
      if (!stUse.isFile()) {
        res.writeHead(404).end("Not found");
        return;
      }
    } else if (err || !st.isFile()) {
      res.writeHead(404).end("Not found");
      return;
    }

    const size = stUse.size;
    const ext = path.extname(fp).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const range = req.headers.range;

    if (range) {
      const parsed = parseRange(range, size);
      if (!parsed) {
        res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
        return;
      }
      const [start, end] = parsed;
      const len = end - start + 1;
      res.writeHead(206, {
        "Content-Type": type,
        "Content-Length": String(len),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      const stream = fs.createReadStream(fp, { start, end });
      stream.on("error", () => res.destroy());
      res.on("close", () => stream.destroy());
      stream.pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = fs.createReadStream(fp);
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  });
});

/** Best-effort: warn when hero MP4s are Git LFS pointers (bytes), not fetched blobs. */
function warnIfLfsPointerSample() {
  const sample = path.join(ROOT, "media", "website-video", "website-hero.mp4");
  try {
    const fd = fs.openSync(sample, "r");
    const buf = Buffer.alloc(64);
    const n = fs.readSync(fd, buf, 0, 64, 0);
    fs.closeSync(fd);
    const head = buf.slice(0, n).toString("utf8", 0, n);
    if (head.includes("git-lfs.github.com/spec/v1")) {
      console.warn(
        "\n[WARN] media/*.mp4 look like Git LFS pointers, run: git lfs pull\n",
      );
    }
  } catch {
    /* missing file */
  }
}

server.on("error", (err) => {
  console.error(`Preview server error (${PORT}):`, err.message);
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is in use. Try: set PORT=4176  or  stop the other preview.`);
  }
  process.exit(1);
});

const listenOpts =
  LISTEN_HOST === "::"
    ? { port: PORT, host: "::", ipv6Only: false }
    : { port: PORT, host: LISTEN_HOST };

server.listen(listenOpts, () => {
  warnIfLfsPointerSample();
  console.log(`Preview: http://127.0.0.1:${PORT}/  |  http://localhost:${PORT}/`);
  if (process.env.PREVIEW_ROOT) {
    console.log(`(root: ${ROOT})`);
  } else {
    console.log("(Sector Scavengers site — this repo. Lore: /lore/index.html)");
  }
  if (process.env.PREVIEW_HINT) {
    console.log(process.env.PREVIEW_HINT);
  }
});
