import https from "https";

const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const GSC_TOKEN = process.env.PUBLIC_GSC_VERIFICATION || "iaqlM8LbV4PXhOqkuPvUfIvl_0JiGQm8Kc4HAI1qPeA";

if (!NETLIFY_AUTH_TOKEN) {
  console.log("NETLIFY_AUTH_TOKEN is not set. Skipping automated DNS TXT insertion.");
  process.exit(0);
}

function netlifyRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.netlify.com",
      port: 443,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "JobAlertGroups-Automation",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log("Fetching Netlify DNS zones...");
  const zonesRes = await netlifyRequest("GET", "/dns_zones");
  if (zonesRes.status !== 200 || !Array.isArray(zonesRes.data)) {
    console.log("No DNS zones found or API returned:", zonesRes.status, zonesRes.data);
    return;
  }

  const zone = zonesRes.data.find((z) => z.name === "jobalertgroups.com" || z.domain === "jobalertgroups.com");
  if (!zone) {
    console.log("DNS zone for jobalertgroups.com not found in Netlify account.");
    return;
  }

  console.log(`Found DNS zone: ${zone.name} (ID: ${zone.id})`);

  // Check existing records
  const recordsRes = await netlifyRequest("GET", `/dns_zones/${zone.id}/dns_records`);
  const existingRecords = Array.isArray(recordsRes.data) ? recordsRes.data : [];
  const txtValue = `google-site-verification=${GSC_TOKEN}`;

  const exists = existingRecords.some((r) => r.type === "TXT" && r.value.includes(GSC_TOKEN));
  if (exists) {
    console.log("✅ Google Search Console TXT record already exists in Netlify DNS zone.");
    return;
  }

  console.log(`Adding TXT record "${txtValue}" to Netlify DNS zone...`);
  const addRes = await netlifyRequest("POST", `/dns_zones/${zone.id}/dns_records`, {
    type: "TXT",
    hostname: "jobalertgroups.com",
    value: txtValue,
    ttl: 3600,
  });

  if (addRes.status === 201 || addRes.status === 200) {
    console.log("✅ Successfully added Google Search Console TXT record to Netlify DNS zone!");
  } else {
    console.log("API response adding record:", addRes.status, addRes.data);
  }
}

main().catch(console.error);
