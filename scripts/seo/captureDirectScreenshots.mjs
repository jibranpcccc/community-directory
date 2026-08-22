import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const chromePath = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"';
const outputDir = path.resolve("./audit/screenshots");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const distDir = path.resolve("./dist");
const pages = [
  { name: "homepage", filePath: path.join(distDir, "index.html") },
  { name: "jobs", filePath: path.join(distDir, "jobs", "index.html") },
  { name: "country-canada", filePath: path.join(distDir, "country", "canada", "index.html") },
  { name: "category-tech", filePath: path.join(distDir, "category", "tech-jobs", "index.html") },
  { name: "platform-telegram", filePath: path.join(distDir, "platform", "telegram", "index.html") },
  { name: "group-northerndev-indexable", filePath: path.join(distDir, "group", "northerndev-formerly-tech-career-north-discord", "index.html") },
  { name: "group-usajobs-noindex", filePath: path.join(distDir, "group", "usa-jobs-telegram", "index.html") },
];

const viewports = [
  { name: "390px", width: 390, height: 844 },
  { name: "768px", width: 768, height: 1024 },
  { name: "1440px", width: 1440, height: 900 },
];

console.log("Capturing 21 responsive audit screenshots to audit/screenshots/...");
for (const p of pages) {
  if (!fs.existsSync(p.filePath)) {
    console.error(`File not found: ${p.filePath}`);
    continue;
  }
  const fileUrl = `file:///${p.filePath.replace(/\\/g, "/")}`;
  for (const vp of viewports) {
    const screenshotFile = path.join(outputDir, `${p.name}-${vp.name}.png`);
    try {
      execSync(
        `${chromePath} --headless=new --screenshot="${screenshotFile}" --window-size=${vp.width},${vp.height} --hide-scrollbars "${fileUrl}"`,
        { stdio: "ignore" }
      );
      console.log(`✅ Captured ${p.name} @ ${vp.name} (${fs.statSync(screenshotFile).size} bytes)`);
    } catch (err) {
      console.error(`Failed to capture ${p.name} @ ${vp.name}:`, err.message);
    }
  }
}

console.log("✅ All responsive screenshots saved in audit/screenshots/");
