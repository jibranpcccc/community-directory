import lighthouse from "file:///C:/Users/jibra/AppData/Roaming/npm/node_modules/lighthouse/core/index.js";
import * as chromeLauncher from "file:///C:/Users/jibra/AppData/Roaming/npm/node_modules/lighthouse/node_modules/chrome-launcher/dist/index.js";
import fs from "fs";
import http from "http";
import path from "path";

// Start static preview server on port 8086
const distDir = path.resolve("./dist");
const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath.endsWith("/")) reqPath += "index.html";
  else if (!path.extname(reqPath)) reqPath += "/index.html";

  const filePath = path.join(distDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
    res.end(fs.readFileSync(filePath));
  } else {
    const notFound = path.join(distDir, "404.html");
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end(fs.readFileSync(notFound));
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  }
});

async function runSingleLighthouse(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  const options = {
    logLevel: "error",
    output: "json",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    port: chrome.port,
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      disabled: false,
    },
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

server.listen(8086, async () => {
  console.log("=== STARTING MOBILE LIGHTHOUSE AUDIT RUNS ===");

  const report = {};

  // 1. Homepage 3 mobile runs
  console.log("Running Homepage Mobile Run 1...");
  const hp1 = await runSingleLighthouse("http://localhost:8086/");
  console.log("Homepage Run 1:", hp1);

  console.log("Running Homepage Mobile Run 2...");
  const hp2 = await runSingleLighthouse("http://localhost:8086/");
  console.log("Homepage Run 2:", hp2);

  console.log("Running Homepage Mobile Run 3...");
  const hp3 = await runSingleLighthouse("http://localhost:8086/");
  console.log("Homepage Run 3:", hp3);

  // Compute Median for Homepage
  const perfScores = [hp1.perf, hp2.perf, hp3.perf].sort((a, b) => a - b);
  const medianPerf = perfScores[1];

  report.homepage = {
    run1: hp1,
    run2: hp2,
    run3: hp3,
    median: {
      perf: medianPerf,
      a11y: hp2.a11y,
      bp: hp2.bp,
      seo: hp2.seo,
      lcp: hp2.lcp,
      cls: hp2.cls,
      tbt: hp2.tbt,
    },
  };

  // 2. Key Routes
  console.log("Auditing /jobs/...");
  report.jobs = await runSingleLighthouse("http://localhost:8086/jobs/");

  console.log("Auditing /country/canada/...");
  report.market = await runSingleLighthouse("http://localhost:8086/country/canada/");

  console.log("Auditing /category/tech-jobs/...");
  report.category = await runSingleLighthouse("http://localhost:8086/category/tech-jobs/");

  console.log("Auditing /platform/telegram/...");
  report.platform = await runSingleLighthouse("http://localhost:8086/platform/telegram/");

  console.log("Auditing Indexable Group /group/northerndev-formerly-tech-career-north-discord/...");
  report.groupIndexable = await runSingleLighthouse(
    "http://localhost:8086/group/northerndev-formerly-tech-career-north-discord/"
  );

  console.log("Auditing Noindex Group /group/usa-jobs-telegram/...");
  report.groupNoindex = await runSingleLighthouse("http://localhost:8086/group/usa-jobs-telegram/");

  fs.writeFileSync("audit/lighthouse-report.json", JSON.stringify(report, null, 2));
  console.log("✅ Wrote audit/lighthouse-report.json");

  server.close(() => {
    console.log("Preview server closed.");
    process.exit(0);
  });
});
