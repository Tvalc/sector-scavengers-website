import fs from "fs";
const c = fs.readFileSync("lore/novel/ch01.html", "utf8");
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["novel-p1", "novel-p2", "novel-p3", "novel-p4", "novel-p5"];
for (const id of ids) {
  console.log("===== " + id + " =====");
  const re = new RegExp('id="' + id + '"[\\s\\S]*?</article>');
  const m = re.exec(c);
  if (!m) {
    console.log("(not found)");
    console.log("");
    continue;
  }
  const pm = /art-prompt-text">([^<]+)</.exec(m[0]);
  console.log(pm ? pm[1] : "(no prompt)");
  console.log("");
}
