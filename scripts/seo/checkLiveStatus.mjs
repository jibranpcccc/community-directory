import https from "https";

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    }).on("error", reject);
  });
}

async function check() {
  const pages = [
    { name: "home", url: "https://communityhub-directory.netlify.app/" },
    { name: "jobs", url: "https://communityhub-directory.netlify.app/jobs/" },
    { name: "how-we-verify", url: "https://communityhub-directory.netlify.app/how-we-verify/" },
    { name: "about", url: "https://communityhub-directory.netlify.app/about/" },
    { name: "safety", url: "https://communityhub-directory.netlify.app/safety/" },
    { name: "country-canada", url: "https://communityhub-directory.netlify.app/country/canada/" },
    { name: "category-tech", url: "https://communityhub-directory.netlify.app/category/tech-jobs/" },
    { name: "platform-discord", url: "https://communityhub-directory.netlify.app/platform/discord/" },
    { name: "group", url: "https://communityhub-directory.netlify.app/group/northerndev-formerly-tech-career-north-discord/" },
  ];

  console.log("=========================================");
  console.log("CHECKING LIVE NETLIFY PRODUCTION DEPLOYMENT");
  console.log("=========================================");

  for (const p of pages) {
    const res = await fetchPage(p.url);
    const hasCorruptedDoubleQ = /\?{2,}/.test(
      res.body
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<svg[\s\S]*?<\/svg>/gi, "")
        .replace(/<[^>]+>/g, " ")
    );
    const hasCorruptedTripleQ = res.body.includes("???");
    const canonicalMatch = res.body.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
    const canonical = canonicalMatch ? canonicalMatch[1] : "NONE";

    console.log(
      `[${p.name}] HTTP ${res.statusCode} | Canonical: ${canonical} | Corrupted ??: ${hasCorruptedDoubleQ} | ???: ${hasCorruptedTripleQ}`
    );
  }

  // Check 301 redirect on /jobs
  const redirectRes = await new Promise((resolve) => {
    https.get("https://communityhub-directory.netlify.app/jobs", (res) => {
      resolve({ statusCode: res.statusCode, location: res.headers.location });
    });
  });
  console.log(`\n[Redirect Test: /jobs] HTTP ${redirectRes.statusCode} -> Location: ${redirectRes.location}`);

  // Check 404 on out-of-scope routes
  const outOfScopeRoutes = [
    "/country/france/",
    "/platform/reddit/",
    "/platform/slack/",
    "/platform/skool/",
    "/platform/github/",
    "/this-url-must-not-exist-seo-test-987654",
  ];

  console.log("\n=========================================");
  console.log("CHECKING OUT-OF-SCOPE ROUTES (EXPECTING 404)");
  console.log("=========================================");
  for (const route of outOfScopeRoutes) {
    const res = await fetchPage(`https://communityhub-directory.netlify.app${route}`);
    console.log(`[404 Test: ${route}] HTTP ${res.statusCode}`);
  }
}

check().catch(console.error);
