import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const tmpDir = path.resolve("./.lighthouse-tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

function auditRoute(url, label) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const outputPath = path.join(tmpDir, `report-${runId}.json`);
  const profileDir = path.join(tmpDir, `chrome-profile-${runId}`);
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  console.log(`Auditing ${label}: ${url}...`);
  try {
    const cmd = `npx --yes lighthouse "${url}" --output=json --output-path="${outputPath}" --chrome-flags="--headless --no-sandbox --disable-gpu --user-data-dir=${profileDir}" --quiet --only-categories=performance,accessibility,best-practices,seo`;
    execSync(cmd, { stdio: "pipe", timeout: 60000 });

    if (fs.existsSync(outputPath)) {
      const data = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      const perf = Math.round((data.categories.performance?.score || 0) * 100);
      const a11y = Math.round((data.categories.accessibility?.score || 0) * 100);
      const bp = Math.round((data.categories["best-practices"]?.score || 0) * 100);
      const seo = Math.round((data.categories.seo?.score || 0) * 100);

      const lcp = data.audits["largest-contentful-paint"]?.displayValue || "N/A";
      const lcpNumeric = data.audits["largest-contentful-paint"]?.numericValue || 0;
      const cls = data.audits["cumulative-layout-shift"]?.displayValue || "0";
      const tbt = data.audits["total-blocking-time"]?.displayValue || "0 ms";
      const tbtNumeric = data.audits["total-blocking-time"]?.numericValue || 0;

      fs.unlinkSync(outputPath);
      return { label, perf, a11y, bp, seo, lcp, lcpNumeric, cls, tbt, tbtNumeric };
    }
  } catch (err) {
    console.error(`Error auditing ${label}:`, err.message);
  }
  return null;
}

async function main() {
  console.log("=== 1. AUDITING /platform/telegram/ ===");
  const telegramResult = auditRoute("https://communityhub-directory.netlify.app/platform/telegram/", "Telegram Platform Hub");
  console.log("Telegram Result:", telegramResult);

  console.log("\n=== 2. RUNNING 3 HOMEPAGE LIGHTHOUSE AUDITS ===");
  const homeRuns = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`\nHomepage Run #${i}...`);
    const r = auditRoute("https://communityhub-directory.netlify.app/", `Home Run ${i}`);
    if (r) homeRuns.push(r);
  }

  console.log("\n=== HOMEPAGE 3-RUN SUMMARY ===");
  console.table(homeRuns);

  if (homeRuns.length >= 3) {
    const sortedPerf = [...homeRuns].map((r) => r.perf).sort((a, b) => a - b);
    const sortedLcp = [...homeRuns].map((r) => r.lcpNumeric).sort((a, b) => a - b);
    const sortedTbt = [...homeRuns].map((r) => r.tbtNumeric).sort((a, b) => a - b);

    const medianPerf = sortedPerf[1];
    const medianLcpMs = sortedLcp[1];
    const medianTbtMs = sortedTbt[1];

    console.log("\n=== MEDIAN HOMEPAGE METRICS ===");
    console.log(`Median Performance : ${medianPerf}`);
    console.log(`Median LCP         : ${(medianLcpMs / 1000).toFixed(1)} s`);
    console.log(`Median TBT         : ${Math.round(medianTbtMs)} ms`);
  }
}

main();
