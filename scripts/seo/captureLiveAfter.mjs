import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const chromePath = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"';
const outputDir = path.resolve("./audit-artifacts/after-screenshots");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const pages = [
  { name: "homepage", url: "https://communityhub-directory.netlify.app/" },
  { name: "jobs", url: "https://communityhub-directory.netlify.app/jobs/" },
  { name: "group", url: "https://communityhub-directory.netlify.app/group/northerndev-formerly-tech-career-north-discord/" },
  { name: "country-canada", url: "https://communityhub-directory.netlify.app/country/canada/" },
  { name: "how-we-verify", url: "https://communityhub-directory.netlify.app/how-we-verify/" },
  { name: "safety", url: "https://communityhub-directory.netlify.app/safety/" },
  { name: "about", url: "https://communityhub-directory.netlify.app/about/" },
  { name: "category-tech", url: "https://communityhub-directory.netlify.app/category/tech-jobs/" },
  { name: "platform-discord", url: "https://communityhub-directory.netlify.app/platform/discord/" },
];

const viewports = [
  { name: "mobile_390", width: 390, height: 844 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "desktop_1440", width: 1440, height: 900 },
];

console.log("Capturing LIVE AFTER screenshots...");
for (const p of pages) {
  for (const vp of viewports) {
    const screenshotFile = path.join(outputDir, `${p.name}-${vp.name}.png`);
    try {
      execSync(
        `${chromePath} --headless=new --screenshot="${screenshotFile}" --window-size=${vp.width},${vp.height} --hide-scrollbars "${p.url}"`,
        { stdio: "ignore" }
      );
      console.log(`✓ Captured LIVE ${p.name} @ ${vp.name} (${fs.statSync(screenshotFile).size} bytes)`);
    } catch (e) {
      console.error(`Failed to capture ${p.name} @ ${vp.name}:`, e.message);
    }
  }
}
console.log("All LIVE AFTER screenshots captured in ./audit-artifacts/after-screenshots/");
