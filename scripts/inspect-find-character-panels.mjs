import fs from "fs";
const target = process.argv[2] || "Imani";
const max = Number(process.argv[3] || 3);
const c = fs.readFileSync("lore/novel/ch01.html", "utf8");
const re = /id="(novel-p\d+)"[\s\S]*?<\/article>/g;
let m;
let hits = 0;
while ((m = re.exec(c)) !== null) {
  if (!new RegExp(`\\b${target}\\b`).test(m[0])) continue;
  hits++;
  if (hits > max) break;
  const pm = /art-prompt-text">([^<]+)</.exec(m[0]);
  console.log("===== " + m[1] + " =====");
  console.log(pm ? pm[1] : "(no prompt)");
  console.log("");
}
console.log("Total panels mentioning " + target + ": at least " + hits);
