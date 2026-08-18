import { performHttpLinkCheck, type LinkValidationResult } from "./validateUrl";
import { extractCommunityIdentifier } from "../data/normalizeUrl";

/**
 * Validates a public Discord invite (e.g. https://discord.gg/code).
 * Attempts public invite check API endpoint or web view.
 */
export async function validateDiscordLink(url: string): Promise<LinkValidationResult> {
  const code = extractCommunityIdentifier(url, "discord");
  if (!code) {
    return {
      url,
      status: "dead",
      message: "Missing invite code",
      checkedAt: new Date().toISOString(),
    };
  }

  // Check public Discord API invite endpoint
  const apiUrl = `https://discord.com/api/v9/invites/${code}`;
  const result = await performHttpLinkCheck(apiUrl, 6000);

  if (result.httpStatus === 200) {
    return {
      url,
      status: "active",
      httpStatus: 200,
      message: "Discord Invite Valid",
      checkedAt: result.checkedAt,
    };
  }

  if (result.httpStatus === 404) {
    return {
      url,
      status: "dead",
      httpStatus: 404,
      message: "Discord Invite Expired or Invalid",
      checkedAt: result.checkedAt,
    };
  }

  // If rate limited or restricted, fall back to base URL check or unknown
  return {
    url,
    status: "unknown",
    httpStatus: result.httpStatus,
    message: result.message,
    checkedAt: result.checkedAt,
  };
}
