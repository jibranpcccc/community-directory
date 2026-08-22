import { execSync } from "child_process";
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";

// Ensure directories exist
const screenshotDir = path.resolve("./audit/screenshots");
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// 1. Live Custom Domain & Redirect Matrix Test
async function testEndpoint(reqUrl, follow = false) {
  return new Promise((resolve) => {
    const isHttps = reqUrl.startsWith("https://");
    const client = isHttps ? https : http;
    const urlObj = new URL(reqUrl);

    // Resolve apex and www to Netlify Edge IP
    const options = {
      hostname: "52.74.6.109",
      port: isHttps ? 443 : 80,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      servername: urlObj.hostname,
      headers: {
        Host: urlObj.hostname,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    };

    const req = client.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        resolve({
          reqUrl,
          statusCode: res.statusCode,
          location: res.headers.location || null,
          contentType: res.headers["content-type"] || null,
          server: res.headers.server || null,
          strictTransportSecurity: res.headers["strict-transport-security"] || null,
          xFrameOptions: res.headers["x-frame-options"] || null,
          contentSecurityPolicy: res.headers["content-security-policy"] || null,
          bodyLength: data.length,
          bodySnippet: data.slice(0, 1000),
        });
      });
    });

    req.on("error", (err) => {
      resolve({ reqUrl, error: err.message });
    });
    req.end();
  });
}

async function runLiveTests() {
  console.log("=== RUNNING LIVE REDIRECT & ENDPOINT AUDIT ===");

  const testUrls = [
    "http://jobalertgroups.com/",
    "https://jobalertgroups.com/",
    "http://www.jobalertgroups.com/",
    "https://www.jobalertgroups.com/",
    "http://www.jobalertgroups.com/jobs/",
    "https://www.jobalertgroups.com/country/canada/",
    "https://communityhub-directory.netlify.app/",
    "https://communityhub-directory.netlify.app/jobs/",
    "https://communityhub-directory.netlify.app/country/canada/",
    "https://communityhub-directory.netlify.app/platform/telegram/",
    "https://communityhub-directory.netlify.app/group/northerndev-formerly-tech-career-north-discord/",
    "https://jobalertgroups.com/robots.txt",
    "https://jobalertgroups.com/sitemap-index.xml",
    "https://jobalertgroups.com/sitemap-0.xml",
    "https://jobalertgroups.com/this-route-must-not-exist-987654/",
  ];

  const results = [];
  for (const u of testUrls) {
    const res = await testEndpoint(u);
    console.log(`[${res.statusCode || "ERR"}] ${u} -> Location: ${res.location || "N/A"}`);
    results.push(res);
  }

  fs.writeFileSync("audit/live-endpoint-results.json", JSON.stringify(results, null, 2));
  console.log("✅ Wrote audit/live-endpoint-results.json");
}

runLiveTests().catch(console.error);
