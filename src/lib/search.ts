import type { Community } from "../types/community";

/**
 * Normalizes text for search indexing and matching.
 */
function normalizeSearchText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Searches an array of communities against a query string.
 * Matches title, description, category, subcategory, tags, platform, and language.
 */
export function searchCommunities(
  communities: Community[],
  query: string
): Community[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return communities;

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return communities.filter((community) => {
    // Build combined searchable document
    const searchTarget = [
      community.title,
      community.description || "",
      community.category,
      community.subcategory || "",
      community.platform,
      community.language || "",
      community.country || "",
      ...(community.tags || []),
    ]
      .map(normalizeSearchText)
      .join(" ");

    // Every query token must match somewhere in the document
    return queryTokens.every((token) => searchTarget.includes(token));
  });
}
