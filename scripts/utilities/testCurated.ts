import { validateDiscordLink } from "../validate/discord";
import { validateTelegramLink } from "../validate/telegram";

async function verifyCurated() {
  const discordInvites = [
    "https://discord.gg/grF4GTXXYm", // Astro
    "https://discord.gg/HBherRA",    // Vue Land
    "https://discord.gg/openai",     // OpenAI
    "https://discord.gg/reactiflux", // Reactiflux
    "https://discord.gg/nextjs",     // Next.js
    "https://discord.gg/learnaitogether", // Learn AI Together
    "https://discord.gg/typescript", // TypeScript
  ];

  console.log("--- DISCORD VALIDATION ---");
  for (const url of discordInvites) {
    const res = await validateDiscordLink(url);
    console.log(url, "=>", res.status, "| Title:", res.extractedTitle, "| Members:", res.extractedMemberCount);
  }

  const telegramLinks = [
    "https://t.me/react_native_community",
    "https://t.me/python_devs_hub",
  ];

  console.log("--- TELEGRAM VALIDATION ---");
  for (const url of telegramLinks) {
    const res = await validateTelegramLink(url);
    console.log(url, "=>", res.status, "| Title:", res.extractedTitle, "| Extra:", res.extractedMemberCount);
  }
}

verifyCurated();
