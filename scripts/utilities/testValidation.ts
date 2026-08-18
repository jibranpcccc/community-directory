async function testTelegram() {
  const handles = [
    "react_native_community",
    "macro_forex_edu",
    "eth_builders_hub",
    "python_devs_hub",
    "durov",
    "global_remote_tech_jobs",
    "saas_deals_alerts",
  ];

  console.log("=== TELEGRAM SEMANTIC VALIDATION TEST ===");
  for (const h of handles) {
    try {
      const res = await fetch(`https://t.me/${h}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const html = await res.text();
      const isContactOnly =
        html.includes("If you have Telegram, you can contact") ||
        html.includes("Contact @") ||
        html.includes("You can contact @");

      const titleMatch = html.match(/<div class="tgme_page_title"[^>]*>([\s\S]*?)<\/div>/);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

      const extraMatch = html.match(/<div class="tgme_page_extra"[^>]*>([\s\S]*?)<\/div>/);
      const extra = extraMatch ? extraMatch[1].replace(/<[^>]+>/g, "").trim() : "";

      const descMatch = html.match(/<div class="tgme_page_description"[^>]*>([\s\S]*?)<\/div>/);
      const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";

      const isRealCommunity =
        !isContactOnly && (extra.includes("members") || extra.includes("subscribers"));

      console.log(`@${h}:`);
      console.log(`  Valid Community: ${isRealCommunity ? "✅ YES" : "❌ NO (Contact/Invalid)"}`);
      console.log(`  Title: "${title}"`);
      console.log(`  Extra: "${extra}"`);
      console.log(`  Desc:  "${desc.slice(0, 80)}..."`);
    } catch (e: any) {
      console.error(`@${h} error: ${e.message}`);
    }
  }
}

testTelegram();
