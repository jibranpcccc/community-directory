import { execSync } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";

// Start static preview server on port 8087
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

const tmpDir = path.resolve("./.lighthouse-tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

function runAuditCli(url) {
  const outputPath = path.join(tmpDir, `report-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const cmd = `npx --yes lighthouse "${url}" --output=json --output-path="${outputPath}" --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet --only-categories=performance,accessibility,best-practices,seo`;
  try {
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
      return { url, perf, a11y, bp, seo, lcp, cls, tbt };
    }
  } catch (e) {
    console.error(`Audit error on ${url}:`, e.message);
  }
  return { url, perf: 0, a11y: 0, bp: 0, seo: 0, lcp: "ERR", cls: "ERR", tbt: "ERR" };
}

server.listen(8087, () => {
  console.log("=== STARTING LIGHTHOUSE CLI AUDITS ON HTTP://LOCALHOST:8087 ===");

  console.log("Running Homepage Mobile Run 1...");
  const hp1 = runAuditCli("http://localhost:8087/");
  console.log("HP Run 1:", hp1);

  console.log("Running Homepage Mobile Run 2...");
  const hp2 = runAuditCli("http://localhost:8087/");
  console.log("HP Run 2:", hp2);

  console.log("Running Homepage Mobile Run 3...");
  const hp3 = runAuditCli("http://localhost:8087/");
  console.log("HP Run 3:", hp3);

  const perfScores = [hp1.perf, hp2.perf, hp3.perf].sort((a, b) => a - b);
  const medianPerf = perfScores[1];

  const report = {
    homepage: {
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
    },
  };

  console.log("Auditing /jobs/...");
  report.jobs = runAuditCli("http://localhost:8087/jobs/");

  console.log("Auditing /country/canada/...");
  report.market = runAuditCli("http://localhost:8087/country/canada/");

  console.log("Auditing /category/tech-jobs/...");
  report.category = runAuditCli("http://localhost:8087/category/tech-jobs/");

  console.log("Auditing /platform/telegram/...");
  report.platform = runAuditCli("http://localhost:8087/platform/telegram/");

  console.log("Auditing Indexable Group...");
  report.groupIndexable = runAuditCli("http://localhost:8087/group/northerndev-formerly-tech-career-north-discord/");

  console.log("Auditing Noindex Group...");
  report.groupNoindex = runAuditCli("http://localhost:8087/group/usa-jobs-telegram/");

  fs.writeFileSync("audit/lighthouse-report.json", JSON.stringify(report, null, 2));
  console.log("✅ Wrote audit/lighthouse-report.json");

  server.close(() => {
    console.log("Lighthouse audit complete.");
    process.exit(0);
  });
});
