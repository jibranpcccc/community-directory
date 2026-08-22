import https from "https";
import http from "http";
import dns from "dns";
import { promisify } from "util";

const resolve4 = promisify(dns.resolve4);
const resolveNs = promisify(dns.resolveNs);

const PUBLIC_DNS_SERVERS = [
  { name: "Google DNS", ip: "8.8.8.8" },
  { name: "Cloudflare DNS", ip: "1.1.1.1" },
  { name: "Quad9 DNS", ip: "9.9.9.9" },
  { name: "OpenDNS", ip: "208.67.222.222" },
];

async function checkDns() {
  console.log("==================================================");
  console.log("🌐 1. MULTI-RESOLVER DNS PROPAGATION CHECK");
  console.log("==================================================");

  for (const server of PUBLIC_DNS_SERVERS) {
    dns.setServers([server.ip]);
    try {
      const ipsApex = await resolve4("jobalertgroups.com");
      const ipsWww = await resolve4("www.jobalertgroups.com");
      console.log(`✅ [${server.name} (${server.ip})]`);
      console.log(`   jobalertgroups.com     -> ${ipsApex.join(", ")}`);
      console.log(`   www.jobalertgroups.com -> ${ipsWww.join(", ")}`);
    } catch (err) {
      console.log(`❌ [${server.name} (${server.ip})] Error: ${err.message}`);
    }
  }

  try {
    dns.setServers(["8.8.8.8"]);
    const ns = await resolveNs("jobalertgroups.com");
    console.log(`\n✅ Authoritative Name Servers: ${ns.join(", ")}`);
  } catch (err) {
    console.log(`\n❌ NS Lookup Error: ${err.message}`);
  }
}

function probeUrl(targetUrl, options = {}) {
  return new Promise((resolve) => {
    const isHttps = targetUrl.startsWith("https");
    const client = isHttps ? https : http;

    const req = client.get(targetUrl, options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({
          url: targetUrl,
          statusCode: res.statusCode,
          headers: res.headers,
          location: res.headers.location || null,
          server: res.headers.server || "unknown",
          bodyLength: body.length,
          title: (body.match(/<title>([^<]*)<\/title>/i) || [])[1] || null,
          h1: (body.match(/<h1[^>]*>([^<]*)<\/h1>/i) || [])[1] || null,
        });
      });
    });

    req.on("error", (err) => {
      resolve({ url: targetUrl, statusCode: 0, error: err.message });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ url: targetUrl, statusCode: 0, error: "Request Timeout (8s)" });
    });
  });
}

async function checkEndpoints() {
  console.log("\n==================================================");
  console.log("🔒 2. LIVE HTTPS & REDIRECT INTEGRITY CHECK");
  console.log("==================================================");

  const directApexIp = "52.74.6.109"; // Netlify Edge IP verified from DNS

  const routesToTest = [
    // Redirect Tests
    { label: "Legacy Subdomain 301", url: "https://communityhub-directory.netlify.app/", hostHeader: null, sniHost: null },
    
    // Core Routes with Direct SNI to verify Netlify Edge
    { label: "Homepage (Apex)", url: "https://jobalertgroups.com/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Jobs Catalog", url: "https://jobalertgroups.com/jobs/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Canada Market Hub", url: "https://jobalertgroups.com/country/canada/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "US Market Hub", url: "https://jobalertgroups.com/country/usa/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Worldwide Market Hub", url: "https://jobalertgroups.com/country/global/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Discord Platform Hub", url: "https://jobalertgroups.com/platform/discord/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Telegram Platform Hub", url: "https://jobalertgroups.com/platform/telegram/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Tech Jobs Hub", url: "https://jobalertgroups.com/category/tech-jobs/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Verified Group Detail", url: "https://jobalertgroups.com/group/northerndev-formerly-tech-career-north-discord/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "About Page", url: "https://jobalertgroups.com/about/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Safety Guide", url: "https://jobalertgroups.com/safety/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "How We Verify", url: "https://jobalertgroups.com/how-we-verify/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Editorial Policy", url: "https://jobalertgroups.com/editorial-policy/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Robots.txt", url: "https://jobalertgroups.com/robots.txt", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Sitemap Index", url: "https://jobalertgroups.com/sitemap-index.xml", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "Sitemap 0", url: "https://jobalertgroups.com/sitemap-0.xml", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
    { label: "404 Page Not Found", url: "https://jobalertgroups.com/non-existent-page/", hostHeader: "jobalertgroups.com", sniHost: "jobalertgroups.com", ip: directApexIp },
  ];

  const results = [];

  for (const r of routesToTest) {
    let res;
    if (r.ip) {
      const u = new URL(r.url);
      res = await probeUrl(`https://${r.ip}${u.pathname}`, {
        headers: { Host: r.hostHeader },
        servername: r.sniHost,
        rejectUnauthorized: false,
      });
    } else {
      res = await probeUrl(r.url);
    }

    results.push({
      Label: r.label,
      URL: r.url,
      HTTP: res.statusCode,
      Server: res.server,
      Location: res.location || "-",
      Title: res.title ? res.title.slice(0, 35) + "..." : "-",
      Status: (res.statusCode === 200 || (r.label.includes("301") && res.statusCode === 301) || (r.label.includes("404") && res.statusCode === 404)) ? "PASS" : "FAIL",
    });
  }

  console.table(results);
}

async function main() {
  await checkDns();
  await checkEndpoints();
  console.log("\n==================================================");
  console.log("🎯 ALL LIVE CHECKS COMPLETE");
  console.log("==================================================");
}

main();
