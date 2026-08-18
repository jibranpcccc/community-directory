import type { PlatformConfig, PlatformId } from "../types/community";

export const platforms: PlatformConfig[] = [
  {
    id: "telegram",
    name: "Telegram",
    description:
      "Public channels, broadcast groups, and chat communities on Telegram.",
    icon: "telegram",
    badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
    badgeText: "text-sky-700",
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
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    badgeText: "text-indigo-700",
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
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badgeText: "text-emerald-700",
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
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
    badgeText: "text-orange-700",
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
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    badgeText: "text-purple-700",
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
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    badgeText: "text-amber-700",
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
    badgeBg: "bg-gray-50 text-gray-700 border-gray-200",
    badgeText: "text-gray-700",
    hostnamePatterns: ["github.com"],
    urlPrefixes: ["https://github.com/"],
    isConfigured: false,
  },
];

export function getPlatformById(id: string): PlatformConfig | undefined {
  return platforms.find((p) => p.id === id);
}

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
