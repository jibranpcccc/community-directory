import https from "https";

const req = https.request({
  host: "52.74.6.109",
  port: 443,
  path: "/",
  method: "GET",
  servername: "jobalertgroups.com",
  headers: { Host: "jobalertgroups.com" },
}, (res) => {
  let data = "";
  res.on("data", (c) => (data += c));
  res.on("end", () => {
    console.log("=== HTML LIVE INTEGRITY REPORT ===");
    console.log("Status Code :", res.statusCode);
    console.log("Title       :", (data.match(/<title>([^<]*)<\/title>/i) || [])[1]);
    console.log("Canonical   :", (data.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i) || [])[1]);
    console.log("og:url      :", (data.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']*)["']/i) || [])[1]);
    console.log("H1          :", (data.match(/<h1[^>]*>([^<]*)<\/h1>/i) || [])[1]);
    console.log("JSON-LD tags:", (data.match(/application\/ld\+json/g) || []).length);
    console.log("\nCSS Links:");
    const cssMatches = data.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || [];
    cssMatches.forEach((m) => console.log(" ", m));
    console.log("\nScript Tags:");
    const scriptMatches = data.match(/<script[^>]*src=["'][^"']*["'][^>]*><\/script>/gi) || [];
    scriptMatches.forEach((m) => console.log(" ", m));
  });
});

req.on("error", (err) => console.error("Request Error:", err));
req.end();
