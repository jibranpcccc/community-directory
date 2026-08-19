import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const chromePath = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"';
const outputDir = path.resolve("./screenshots");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const pages = [
  { name: "homepage", url: "http://localhost:4321/" },
  { name: "jobs", url: "http://localhost:4321/jobs" },
  { name: "group", url: "http://localhost:4321/group/northerndev-formerly-tech-career-north-discord" },
  { name: "country", url: "http://localhost:4321/country/canada" },
  { name: "category", url: "http://localhost:4321/category/tech-jobs" },
  { name: "how-we-verify", url: "http://localhost:4321/how-we-verify" },
];

const viewports = [
  { name: "mobile_390", width: 390, height: 844 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "desktop_1440", width: 1440, height: 900 },
];

console.log("Capturing visual responsive screenshots...");
for (const p of pages) {
  for (const vp of viewports) {
    const screenshotFile = path.join(outputDir, `${p.name}-${vp.name}.png`);
    try {
      execSync(
        `${chromePath} --headless=new --screenshot="${screenshotFile}" --window-size=${vp.width},${vp.height} --hide-scrollbars "${p.url}"`,
        { stdio: "ignore" }
      );
      console.log(`? Captured ${p.name} @ ${vp.name} (${fs.statSync(screenshotFile).size} bytes)`);
    } catch (e) {
      console.error(`Failed to capture ${p.name} @ ${vp.name}:`, e.message);
    }
  }
}
console.log("All screenshots captured in ./screenshots/");
