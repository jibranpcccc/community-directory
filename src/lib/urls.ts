import type { PlatformId } from "../types/community";
import { detectPlatformFromUrl } from "../config/platforms";

/**
 * Normalizes invite URLs across supported platforms (Telegram, Discord, WhatsApp).
 * Removes tracking parameters, lowercases hostnames, and standardizes domain aliases
 * while preserving exact case-sensitive invitation tokens.
 */
export function normalizeInviteUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") {
    return "";
  }

  let cleaned = rawUrl.trim();

  // Ensure protocol
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname.toLowerCase();
    let pathname = parsed.pathname;

    // Telegram normalization
    if (hostname === "telegram.me" || hostname === "telegram.dog" || hostname === "t.me") {
      hostname = "t.me";
      // Trim trailing slashes from pathname, but preserve path
      pathname = pathname.replace(/\/+$/, "");
      return `https://t.me${pathname}`;
    }

    // Discord normalization
    if (
      hostname === "discord.com" ||
      hostname === "discordapp.com" ||
      hostname === "discord.gg"
    ) {
      // If path starts with /invite/code, rewrite to discord.gg/code
      if (pathname.startsWith("/invite/")) {
        const inviteCode = pathname.replace(/^\/invite\//, "").replace(/\/+$/, "");
        return `https://discord.gg/${inviteCode}`;
      }
      if (hostname === "discord.gg") {
        pathname = pathname.replace(/\/+$/, "");
        return `https://discord.gg${pathname}`;
      }
      pathname = pathname.replace(/\/+$/, "");
      return `https://${hostname}${pathname}`;
    }

    // WhatsApp normalization
    if (hostname === "chat.whatsapp.com" || hostname === "whatsapp.com") {
      if (hostname === "whatsapp.com" && pathname.startsWith("/chat/")) {
        const inviteCode = pathname.replace(/^\/chat\//, "").replace(/\/+$/, "");
        return `https://chat.whatsapp.com/${inviteCode}`;
      }
      pathname = pathname.replace(/\/+$/, "");
      return `https://chat.whatsapp.com${pathname}`;
    }

    // Generic fallback for other platforms
    pathname = pathname.replace(/\/+$/, "");
    return `https://${hostname}${pathname}`;
  } catch {
    // Return original trimmed if URL parsing fails
    return cleaned;
  }
}

/**
 * Extracts a unique platform-specific identifier from an invite URL.
 * e.g., "t.me/react_chat" -> "react_chat"
 * e.g., "discord.gg/reactiflux" -> "reactiflux"
 * e.g., "chat.whatsapp.com/ABC123" -> "ABC123"
 */
export function extractCommunityIdentifier(url: string, platform?: PlatformId): string {
  const normalized = normalizeInviteUrl(url);
  try {
    const parsed = new URL(normalized);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  } catch {
    // Ignore
  }
  return normalized;
}

/**
 * Generates a clean, URL-safe slug from a title and platform.
 */
export function generateSlug(title: string, platform: PlatformId, existingSlugs: string[] = []): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const initialSlug = `${base}-${platform}`;
  let uniqueSlug = initialSlug;
  let counter = 1;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${initialSlug}-${counter}`;
  }

  return uniqueSlug;
}
