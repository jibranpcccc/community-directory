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
  },
  existingList: Community[]
): DuplicateCheckResult {
  const normCandidateUrl = normalizeInviteUrl(candidate.inviteUrl);
  const candIdentifier = extractCommunityIdentifier(normCandidateUrl);

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

    // 3. Slug match (if candidate slug provided)
    if (candidate.slug && candidate.slug === existing.slug) {
      return {
        isDuplicate: true,
        reason: `Slug collision: "${candidate.slug}"`,
        matchedCommunity: existing,
      };
    }

    // 4. Exact Title + Same Platform match
    if (
      candidate.title &&
      candidate.platform === existing.platform &&
      candidate.title.trim().toLowerCase() === existing.title.trim().toLowerCase()
    ) {
      return {
        isDuplicate: true,
        reason: `Identical title on same platform: "${candidate.title}"`,
        matchedCommunity: existing,
      };
    }
  }

  return { isDuplicate: false };
}
