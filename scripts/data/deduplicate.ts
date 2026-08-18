import type { Community } from "../../src/types/community";
import { normalizeInviteUrl, extractCommunityIdentifier } from "./normalizeUrl";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  matchedCommunity?: Community;
}

/**
 * Checks if a candidate is a duplicate against an existing set of communities.
 */
export function isDuplicateListing(
  candidate: {
    inviteUrl: string;
    title?: string;
    platform: string;
    slug?: string;
    category?: string;
    guildId?: string;
  },
  existingList: Community[]
): DuplicateCheckResult {
  const normCandidateUrl = normalizeInviteUrl(candidate.inviteUrl);
  const candIdentifier = extractCommunityIdentifier(normCandidateUrl);

  const cleanTitle = (t?: string) =>
    (t || "")
      .toLowerCase()
      .replace(/\b(community|official|server|group|channel|hub|chat|hq)\b/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const candCleanTitle = cleanTitle(candidate.title);

  for (const existing of existingList) {
    // 1. Primary: Exact normalized invite URL match
    const normExistingUrl = normalizeInviteUrl(existing.inviteUrl);
    if (normCandidateUrl && normCandidateUrl === normExistingUrl) {
      return {
        isDuplicate: true,
        reason: `Exact normalized URL match: "${normCandidateUrl}"`,
        matchedCommunity: existing,
      };
    }

    // 2. Secondary: Platform + identifier match
    if (candidate.platform === existing.platform) {
      const existIdentifier = extractCommunityIdentifier(normExistingUrl);
      if (
        candIdentifier &&
        existIdentifier &&
        candIdentifier.toLowerCase() === existIdentifier.toLowerCase()
      ) {
        return {
          isDuplicate: true,
          reason: `Same platform & identifier match: "${candIdentifier}"`,
          matchedCommunity: existing,
        };
      }
    }

    // 3. Discord Guild ID match
    if (
      candidate.platform === "discord" &&
      existing.platform === "discord" &&
      candidate.guildId &&
      existing.guildId &&
      candidate.guildId === existing.guildId
    ) {
      return {
        isDuplicate: true,
        reason: `Same Discord guild ID: "${candidate.guildId}"`,
        matchedCommunity: existing,
      };
    }

    // 3. Slug match (if candidate slug provided)
    if (candidate.slug && candidate.slug === existing.slug) {
      return {
        isDuplicate: true,
        reason: `Slug collision: "${candidate.slug}"`,
        matchedCommunity: existing,
      };
    }

    // 4. Title match on the same platform
    if (candidate.platform === existing.platform && candidate.title && existing.title) {
      const existCleanTitle = cleanTitle(existing.title);
      if (
        candidate.title.trim().toLowerCase() === existing.title.trim().toLowerCase() ||
        (candCleanTitle.length > 3 && candCleanTitle === existCleanTitle)
      ) {
        return {
          isDuplicate: true,
          reason: `Matching community title on ${candidate.platform}: "${candidate.title}" vs "${existing.title}"`,
          matchedCommunity: existing,
        };
      }
    }
  }

  return { isDuplicate: false };
}
