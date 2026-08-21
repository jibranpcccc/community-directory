import lighthouse from "file:///C:/Users/jibra/AppData/Roaming/npm/node_modules/lighthouse/core/index.js";
import * as chromeLauncher from "file:///C:/Users/jibra/AppData/Roaming/npm/node_modules/lighthouse/node_modules/chrome-launcher/dist/index.js";

async function runAudit(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"] });
  const options = {
    logLevel: "error",
    output: "json",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options);
  const data = runnerResult.lhr;

  const perf = Math.round((data.categories.performance?.score || 0) * 100);
  const a11y = Math.round((data.categories.accessibility?.score || 0) * 100);
  const bp = Math.round((data.categories["best-practices"]?.score || 0) * 100);
  const seo = Math.round((data.categories.seo?.score || 0) * 100);

  const lcp = data.audits["largest-contentful-paint"]?.displayValue || "N/A";
  const cls = data.audits["cumulative-layout-shift"]?.displayValue || "0";
  const tbt = data.audits["total-blocking-time"]?.displayValue || "0 ms";

  await chrome.kill();

  return { url, perf, a11y, bp, seo, lcp, cls, tbt };
}

async function main() {
  console.log("Auditing https://communityhub-directory.netlify.app/platform/telegram/...");
  const res = await runAudit("https://communityhub-directory.netlify.app/platform/telegram/");
  console.log("TELEGRAM PLATFORM AUDIT RESULT:");
  console.log(JSON.stringify(res, null, 2));
}

main();
