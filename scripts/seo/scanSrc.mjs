import fs from "fs";
import path from "path";

function scanDir(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanDir(full));
    } else if (entry.isFile() && (entry.name.endsWith(".astro") || entry.name.endsWith(".ts") || entry.name.endsWith(".json"))) {
      const content = fs.readFileSync(full, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (/\?{2,}/.test(line) || /\uFFFD/.test(line) || /â[€œ™—†œ]/.test(line)) {
          results.push({ file: full, line: idx + 1, text: line.trim() });
        }
      });
    }
  }
  return results;
}

const findings = scanDir("./src");
console.log("Total Findings in src/:", findings.length);
findings.forEach(f => console.log(`[CORRUPT] ${f.file}:${f.line} -> "${f.text}"`));
