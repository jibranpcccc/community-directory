import { extractCommunityIdentifier } from "../data/normalizeUrl";
import type { LinkValidationResult } from "./validateUrl";

/**
 * Validates a public Discord invite (e.g. https://discord.gg/code).
 * Queries Discord's official public v10 API with count metadata.
 */
export async function validateDiscordLink(url: string): Promise<LinkValidationResult> {
  const code = extractCommunityIdentifier(url, "discord");
  const checkedAt = new Date().toISOString();

  if (!code) {
    return {
      url,
      status: "dead",
      message: "Missing Discord invite code",
      checkedAt,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const apiUrl = `https://discord.com/api/v10/invites/${code}?with_counts=true`;
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "CommunityHubDirectory/1.0 (+https://communityhub-directory.netlify.app)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 200) {
      const data = (await res.json()) as any;
      const guildName = data?.guild?.name;
      const memberCount = data?.approximate_member_count ?? null;
      const desc = data?.guild?.description ?? null;

      return {
        url,
        status: "active",
        httpStatus: 200,
        message: "Valid active Discord server",
        checkedAt,
        extractedTitle: guildName,
        extractedDescription: desc,
        extractedMemberCount: memberCount,
      };
    }

    if (res.status === 404) {
      return {
        url,
        status: "dead",
        httpStatus: 404,
        message: "Discord Invite Expired or Invalid",
        checkedAt,
      };
    }

    if (res.status === 429) {
      return {
        url,
        status: "unknown",
        httpStatus: 429,
        message: "Discord API Rate Limited (Temporary)",
        checkedAt,
      };
    }

    return {
      url,
      status: "unknown",
      httpStatus: res.status,
      message: `Discord API responded with HTTP ${res.status}`,
      checkedAt,
    };
  } catch (e: any) {
    return {
      url,
      status: "unknown",
      message: `Network check failed: ${e.message}`,
      checkedAt,
    };
  }
}
