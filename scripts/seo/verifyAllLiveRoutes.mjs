import https from "https";

const BASE_URL = "https://communityhub-directory.netlify.app";

const testRoutes = [
  // 14 Target Markets
  { path: "/country/global/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "GLOBAL Market" },
  { path: "/country/usa/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "USA Market" },
  { path: "/country/uk/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "UK Market" },
  { path: "/country/canada/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Canada Market" },
  { path: "/country/australia/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Australia Market" },
  { path: "/country/india/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "India Market" },
  { path: "/country/germany/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Germany Market" },
  { path: "/country/netherlands/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Netherlands Market" },
  { path: "/country/singapore/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Singapore Market" },
  { path: "/country/uae/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "UAE Market" },
  { path: "/country/philippines/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Philippines Market" },
  { path: "/country/new-zealand/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "New Zealand Market" },
  { path: "/country/ireland/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Ireland Market" },
  { path: "/country/south-africa/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "South Africa Market" },

  // Unsupported countries (must 404 or redirect)
  { path: "/country/france/", expectedHttp: 404, name: "France (Unsupported)" },
  { path: "/country/spain/", expectedHttp: 404, name: "Spain (Unsupported)" },
  { path: "/country/brazil/", expectedHttp: 404, name: "Brazil (Unsupported)" },
  { path: "/country/japan/", expectedHttp: 404, name: "Japan (Unsupported)" },

  // Core Pages
  { path: "/", expectedHttp: 200, expectedRobots: "index, follow", name: "Home" },
  { path: "/jobs/", expectedHttp: 200, expectedRobots: "index, follow", name: "Jobs Catalog" },
  { path: "/platform/discord/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Discord Platform" },
  { path: "/platform/telegram/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Telegram Platform" },
  { path: "/platform/whatsapp/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "WhatsApp Platform" },
  { path: "/category/tech-jobs/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Tech Jobs Category" },
  { path: "/job-type/remote-jobs/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Remote Jobs Type" },
  { path: "/privacy/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Privacy Policy" },
  { path: "/terms/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Terms of Service" },
  { path: "/disclaimer/", expectedHttp: 200, expectedRobots: "noindex, follow", name: "Disclaimer" },
  { path: "/robots.txt", expectedHttp: 200, name: "robots.txt" },
  { path: "/sitemap-index.xml", expectedHttp: 200, name: "sitemap-index.xml" },
  { path: "/sitemap-0.xml", expectedHttp: 200, name: "sitemap-0.xml" },
  { path: "/a-definitely-invalid-url/", expectedHttp: 404, name: "Invalid Route (404 Test)" },
];

function fetchUrl(urlPath) {
  return new Promise((resolve) => {
    const fullUrl = `${BASE_URL}${urlPath}`;
    https.get(fullUrl, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          path: urlPath,
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    }).on("error", (err) => {
      resolve({ path: urlPath, statusCode: 0, error: err.message });
    });
  });
}

async function verifyAll() {
  console.log(`Starting live route verification against ${BASE_URL}...\n`);
  const report = [];

  for (const t of testRoutes) {
    const res = await fetchUrl(t.path);
    const body = res.body || "";

    const titleMatch = body.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 45) : (t.path.endsWith(".xml") || t.path.endsWith(".txt") ? "N/A (Raw Asset)" : "None");

    const robotsMatch = body.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i);
    const robots = robotsMatch ? (robotsMatch[1].includes("noindex") ? "noindex, follow" : "index, follow") : (t.path.endsWith(".xml") || t.path.endsWith(".txt") ? "N/A" : "None");

    const canonicalMatch = body.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
    const canonical = canonicalMatch ? canonicalMatch[1].replace(BASE_URL, "") : "None";

    const h1Match = body.match(/<h1[^>]*>([^<]*)<\/h1>/i);
    const h1 = h1Match ? h1Match[1].trim().slice(0, 40) : "None";

    const hasJsonLd = body.includes('type="application/ld+json"');

    report.push({
      path: t.path,
      http: res.statusCode,
      robots,
      canonical,
      title,
      h1,
      jsonLd: hasJsonLd ? "YES" : "NO",
      status: (res.statusCode === t.expectedHttp || (t.expectedHttp === 404 && (res.statusCode === 404 || res.statusCode === 301 || res.statusCode === 302))) ? "PASS" : "FAIL",
    });
  }

  console.log("==================================================");
  console.log("🌐 LIVE ROUTE VERIFICATION MATRIX");
  console.log("==================================================");
  console.table(report);
}

verifyAll();
