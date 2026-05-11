/**
 * Encode generated/comic/*.png → .webp (keeps filenames, deletes PNG).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "..", "generated", "comic");

if (!fs.existsSync(dir)) {
  console.error("Missing folder:", dir);
  process.exit(1);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));
if (!files.length) {
  console.log("No PNG files in", dir);
  process.exit(0);
}

for (const f of files) {
  const input = path.join(dir, f);
  const base = f.replace(/\.png$/i, "");
  const output = path.join(dir, `${base}.webp`);
  await sharp(input).webp({ quality: 82 }).toFile(output);
  fs.unlinkSync(input);
  console.log("wrote", path.relative(path.resolve(__dirname, ".."), output));
}
