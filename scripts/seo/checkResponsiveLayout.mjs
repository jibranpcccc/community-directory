import puppeteer from "puppeteer";

const routes = [
  "https://communityhub-directory.netlify.app/",
  "https://communityhub-directory.netlify.app/jobs/",
  "https://communityhub-directory.netlify.app/country/global/",
  "https://communityhub-directory.netlify.app/country/canada/",
  "https://communityhub-directory.netlify.app/country/india/",
  "https://communityhub-directory.netlify.app/platform/discord/",
  "https://communityhub-directory.netlify.app/category/tech-jobs/",
  "https://communityhub-directory.netlify.app/group/northerndev-formerly-tech-career-north-discord/",
  "https://communityhub-directory.netlify.app/group/usa-jobs-telegram/",
  "https://communityhub-directory.netlify.app/about/",
  "https://communityhub-directory.netlify.app/safety/",
];

const viewports = [
  { width: 390, height: 844, name: "390px (Mobile)" },
  { width: 768, height: 1024, name: "768px (Tablet)" },
  { width: 1440, height: 900, name: "1440px (Desktop)" },
];

async function run() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  } catch (e) {
    console.log("Puppeteer launch error:", e.message);
    return;
  }

  const results = [];
  for (const vp of viewports) {
    for (const url of routes) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(url, { waitUntil: "domcontentloaded" });

      const metrics = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const scrollWidth = Math.max(body.scrollWidth, html.scrollWidth);
        const clientWidth = html.clientWidth;
        const hasOverflow = scrollWidth > clientWidth;

        // Character corruption check
        const text = body.innerText;
        const hasQuestionMarks = /\?{2,}/.test(text);
        const hasReplacementChar = text.includes("\uFFFD");
        const hasMojibake = /(\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00E2\u0080[\u0090-\u00BF])/.test(text);

        return {
          scrollWidth,
          clientWidth,
          hasOverflow,
          hasCorruption: hasQuestionMarks || hasReplacementChar || hasMojibake,
        };
      });

      results.push({
        viewport: vp.name,
        url: url.replace("https://communityhub-directory.netlify.app", ""),
        clientWidth: metrics.clientWidth,
        scrollWidth: metrics.scrollWidth,
        overflow: metrics.hasOverflow ? "FAIL" : "PASS (0px)",
        corruption: metrics.hasCorruption ? "FAIL" : "CLEAN (0)",
      });

      await page.close();
    }
  }

  await browser.close();
  console.log("\n==================================================");
  console.log("📱 RESPONSIVE VIEWPORT & CHARACTER INTEGRITY AUDIT");
  console.log("==================================================");
  console.table(results);
}

run();
