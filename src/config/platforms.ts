import type { PlatformConfig, PlatformId } from "../types/community";

export const platforms: PlatformConfig[] = [
  {
    id: "telegram",
    name: "Telegram",
    description:
      "Public channels, broadcast groups, and chat communities on Telegram.",
    icon: "telegram",
    badgeBg: "bg-[#BAE6FD] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]",
    badgeText: "text-black",
    hostnamePatterns: ["t.me", "telegram.me", "telegram.dog"],
    urlPrefixes: ["https://t.me/", "https://telegram.me/"],
    isConfigured: true,
  },
  {
    id: "discord",
    name: "Discord",
    description:
      "Public Discord servers for developers, gamers, tech builders, and enthusiasts.",
    icon: "discord",
    badgeBg: "bg-[#DDD6FE] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]",
    badgeText: "text-black",
    hostnamePatterns: ["discord.gg", "discord.com", "discordapp.com"],
    urlPrefixes: ["https://discord.gg/", "https://discord.com/invite/"],
    isConfigured: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description:
      "Public WhatsApp group invites for topical discussions and community networks.",
    icon: "whatsapp",
    badgeBg: "bg-[#A7F3D0] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]",
    badgeText: "text-black",
    hostnamePatterns: ["chat.whatsapp.com", "whatsapp.com"],
    urlPrefixes: ["https://chat.whatsapp.com/"],
    isConfigured: true,
  },
  {
    id: "reddit",
    name: "Reddit",
    description:
      "Subreddits and forum communities on Reddit (Coming Soon).",
    icon: "reddit",
    badgeBg: "bg-[#FED7AA] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]",
    badgeText: "text-black",
    hostnamePatterns: ["reddit.com", "www.reddit.com"],
    urlPrefixes: ["https://reddit.com/r/"],
    isConfigured: false,
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Open Slack workspaces and tech user groups (Coming Soon).",
    icon: "slack",
    badgeBg: "bg-[#FBCFE8] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]",
    badgeText: "text-black",
    hostnamePatterns: ["slack.com", "join.slack.com"],
    urlPrefixes: ["https://join.slack.com/"],
    isConfigured: false,
  },
  {
    id: "skool",
    name: "Skool",
    description:
      "Learning and creator communities on Skool (Coming Soon).",
    icon: "skool",
    badgeBg: "bg-[#FEF08A] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]",
    badgeText: "text-black",
    hostnamePatterns: ["skool.com"],
    urlPrefixes: ["https://www.skool.com/"],
    isConfigured: false,
  },
  {
    id: "github",
    name: "GitHub Discussions",
    description:
      "Open-source community forums and project discussions on GitHub (Coming Soon).",
    icon: "github",
    badgeBg: "bg-[#E2E8F0] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]",
    badgeText: "text-black",
    hostnamePatterns: ["github.com"],
    urlPrefixes: ["https://github.com/"],
    isConfigured: false,
  },
];

export function getPlatformById(id: string): PlatformConfig | undefined {
  return platforms.find((p) => p.id === id);
}

export const getPlatformConfig = getPlatformById;

export function getActivePlatforms(): PlatformConfig[] {
  return platforms.filter((p) => p.isConfigured);
}

export function detectPlatformFromUrl(url: string): PlatformId | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const hostname = parsed.hostname.toLowerCase();

    for (const p of platforms) {
      if (p.hostnamePatterns.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`))) {
        return p.id;
      }
    }
  } catch {
    // Malformed URL
  }
  return null;
}
