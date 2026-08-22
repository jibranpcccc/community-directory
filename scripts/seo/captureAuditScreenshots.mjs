import { execSync } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const chromePath = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"';
const outputDir = path.resolve("./audit/screenshots");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Start a lightweight static HTTP server serving the dist directory on port 8085
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

server.listen(8085, () => {
  console.log("Static preview server listening on http://localhost:8085");

  const pages = [
    { name: "homepage", path: "/" },
    { name: "jobs", path: "/jobs/" },
    { name: "market-canada", path: "/country/canada/" },
    { name: "category-tech", path: "/category/tech-jobs/" },
    { name: "platform-telegram", path: "/platform/telegram/" },
    { name: "group-northerndev-indexable", path: "/group/northerndev-formerly-tech-career-north-discord/" },
    { name: "group-usajobs-noindex", path: "/group/usa-jobs-telegram/" },
  ];

  const viewports = [
    { name: "390", width: 390, height: 844 },
    { name: "768", width: 768, height: 1024 },
    { name: "1440", width: 1440, height: 900 },
  ];

  for (const p of pages) {
    for (const vp of viewports) {
      const fileName = `${p.name}-${vp.name}px.png`;
      const screenshotFile = path.join(outputDir, fileName);
      const targetUrl = `http://localhost:8085${p.path}`;
      try {
        execSync(
          `${chromePath} --headless=new --screenshot="${screenshotFile}" --window-size=${vp.width},${vp.height} --hide-scrollbars "${targetUrl}"`,
          { stdio: "ignore" }
        );
        console.log(`✅ Captured ${fileName} (${fs.statSync(screenshotFile).size} bytes)`);
      } catch (err) {
        console.error(`Failed to capture ${fileName}:`, err.message);
      }
    }
  }

  server.close(() => {
    console.log("Finished capturing all 21 responsive audit screenshots in audit/screenshots/");
  });
});
