import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const urls = [
  { name: "homepage", url: "http://localhost:4321/" },
  { name: "jobs", url: "http://localhost:4321/jobs" },
  { name: "group", url: "http://localhost:4321/group/northerndev-formerly-tech-career-north-discord" },
  { name: "country", url: "http://localhost:4321/country/canada" },
  { name: "category", url: "http://localhost:4321/category/tech-jobs" },
];

const results = [];
const profileDir = path.resolve("./lh-profile");
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

for (const target of urls) {
  console.log(`Running Mobile Lighthouse for ${target.name} (${target.url})...`);
  const outputPath = path.resolve(`./lighthouse-${target.name}.json`);
  
  try {
    const cmd = `npx lighthouse "${target.url}" --output=json --output-path="${outputPath}" --chrome-flags="--headless=new --no-sandbox" --form-factor=mobile --screenEmulation.mobile=true --throttling-method=provided --quiet`;
    execSync(cmd, { stdio: "ignore" });

    if (fs.existsSync(outputPath)) {
      const data = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      const categories = data.categories || {};
      const audits = data.audits || {};

      const perf = Math.round((categories.performance?.score || 0) * 100);
      const a11y = Math.round((categories.accessibility?.score || 0) * 100);
      const bp = Math.round((categories["best-practices"]?.score || 0) * 100);
      const seo = Math.round((categories.seo?.score || 0) * 100);

      const lcp = audits["largest-contentful-paint"]?.displayValue || "N/A";
      const cls = audits["cumulative-layout-shift"]?.displayValue || "0";
      const tbt = audits["total-blocking-time"]?.displayValue || "0 ms";

      results.push({
        name: target.name,
        url: target.url,
        perf,
        a11y,
        bp,
        seo,
        lcp,
        cls,
        tbt,
      });
      // Clean up report json
      try { fs.unlinkSync(outputPath); } catch {}
    }
  } catch (e) {
    console.error(`Attempt failed on ${target.name}, reading fallback if generated...`);
    if (fs.existsSync(outputPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
        const categories = data.categories || {};
        const audits = data.audits || {};

        results.push({
          name: target.name,
          url: target.url,
          perf: Math.round((categories.performance?.score || 0) * 100),
          a11y: Math.round((categories.accessibility?.score || 0) * 100),
          bp: Math.round((categories["best-practices"]?.score || 0) * 100),
          seo: Math.round((categories.seo?.score || 0) * 100),
          lcp: audits["largest-contentful-paint"]?.displayValue || "N/A",
          cls: audits["cumulative-layout-shift"]?.displayValue || "0",
          tbt: audits["total-blocking-time"]?.displayValue || "0 ms",
        });
        fs.unlinkSync(outputPath);
      } catch {}
    }
  }
}

console.log("\n=========================================");
console.log("?? MOBILE LIGHTHOUSE AUDIT RESULTS");
console.log("=========================================");
console.table(results);
console.log("=========================================\n");
