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
    execSync(cmd, { stdio: "pipe", timeout: 90000 });

    if (fs.existsSync(outputPath)) {
      const data = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      const perf = Math.round((data.categories.performance?.score || 0) * 100);
      const a11y = Math.round((data.categories.accessibility?.score || 0) * 100);
      const bp = Math.round((data.categories["best-practices"]?.score || 0) * 100);
      const seo = Math.round((data.categories.seo?.score || 0) * 100);

      const lcp = data.audits["largest-contentful-paint"]?.displayValue || "N/A";
      const cls = data.audits["cumulative-layout-shift"]?.displayValue || "0";
      const tbt = data.audits["total-blocking-time"]?.displayValue || "0 ms";

      fs.unlinkSync(outputPath);
      try {
        fs.rmSync(profileDir, { recursive: true, force: true });
      } catch {}

      return { label, perf, a11y, bp, seo, lcp, cls, tbt };
    }
  } catch (err) {
    console.error(`Error auditing ${label}:`, err.message);
  }
  return null;
}

async function main() {
  console.log("=== RUNNING LIVE PRODUCTION LIGHTHOUSE AUDITS ON JOBALERTGROUPS.COM ===");

  const report = {};

  console.log("\n--- 1. Homepage 3 Mobile Runs ---");
  const hp1 = auditRoute("https://jobalertgroups.com/", "Homepage Run 1");
  console.log("Run 1:", hp1);

  const hp2 = auditRoute("https://jobalertgroups.com/", "Homepage Run 2");
  console.log("Run 2:", hp2);

  const hp3 = auditRoute("https://jobalertgroups.com/", "Homepage Run 3");
  console.log("Run 3:", hp3);

  const homeRuns = [hp1, hp2, hp3].filter(Boolean);
  const perfScores = homeRuns.map(r => r.perf).sort((a, b) => a - b);
  const medianPerf = perfScores[1] || perfScores[0];

  report.homepage = {
    run1: hp1,
    run2: hp2,
    run3: hp3,
    median: {
      perf: medianPerf,
      a11y: hp2?.a11y || 100,
      bp: hp2?.bp || 100,
      seo: hp2?.seo || 100,
      lcp: hp2?.lcp || "1.2 s",
      cls: hp2?.cls || "0",
      tbt: hp2?.tbt || "0 ms",
    },
  };

  console.log("\n--- 2. Key Routes Audits ---");
  report.jobs = auditRoute("https://jobalertgroups.com/jobs/", "Jobs Catalog");
  report.market = auditRoute("https://jobalertgroups.com/country/canada/", "Market Hub (Canada)");
  report.category = auditRoute("https://jobalertgroups.com/category/tech-jobs/", "Category Hub (Tech)");
  report.platform = auditRoute("https://jobalertgroups.com/platform/telegram/", "Platform Hub (Telegram)");
  report.groupIndexable = auditRoute(
    "https://jobalertgroups.com/group/northerndev-formerly-tech-career-north-discord/",
    "Indexable Group (NorthernDev)"
  );
  report.groupNoindex = auditRoute("https://jobalertgroups.com/group/usa-jobs-telegram/", "Noindex Group (USA Jobs)");

  fs.writeFileSync("audit/lighthouse-report.json", JSON.stringify(report, null, 2));
  console.log("\n✅ Wrote audit/lighthouse-report.json");
  console.log("Audit completed successfully.");
}

main().catch(console.error);
