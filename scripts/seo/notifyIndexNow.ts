import https from "https";

const INDEXNOW_KEY = "5f6b28114f4e421ebc7f92e4a8b792da";
const HOST = "jobalertgroups.com";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

const INDEXABLE_URLS = [
  `https://${HOST}/`,
  `https://${HOST}/jobs/`,
  `https://${HOST}/platform/telegram/`,
  `https://${HOST}/category/tech-jobs/`,
  `https://${HOST}/category/government-jobs/`,
  `https://${HOST}/country/india/`,
  `https://${HOST}/country/global/`,
  `https://${HOST}/country/uk/`,
  `https://${HOST}/job-type/government-jobs/`,
  `https://${HOST}/group/northerndev-formerly-tech-career-north-discord/`,
  `https://${HOST}/about/`,
  `https://${HOST}/editorial-policy/`,
  `https://${HOST}/how-we-verify/`,
  `https://${HOST}/safety/`,
];

async function sendIndexNow() {
  const payload = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: INDEXABLE_URLS,
  });

  const options = {
    hostname: "api.indexnow.org",
    port: 443,
    path: "/indexnow",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  return new Promise<void>((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`IndexNow API response: ${res.statusCode} ${res.statusMessage}`);
      res.on("data", (d) => process.stdout.write(d));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`\nSuccessfully notified IndexNow for ${INDEXABLE_URLS.length} URLs!`);
          resolve();
        } else if (res.statusCode === 202) {
          console.log(`\nIndexNow accepted submission (HTTP 202 Accepted).`);
          resolve();
        } else {
          console.warn(`\nIndexNow returned code ${res.statusCode}`);
          resolve();
        }
      });
    });

    req.on("error", (e) => {
      console.error(`IndexNow submission error: ${e.message}`);
      reject(e);
    });

    req.write(payload);
    req.end();
  });
}

sendIndexNow().catch((err) => {
  console.error("IndexNow script failed:", err);
});
