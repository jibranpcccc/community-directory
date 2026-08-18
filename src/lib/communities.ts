import type { Community, PlatformId, FilterOptions, SortOption } from "../types/community";
import groupsData from "../data/groups.json";
import pendingData from "../data/pending-groups.json";

// Type assertions to ensure typed access
const publishedCommunities: Community[] = (groupsData as Community[]).filter(
  (c) => c.published && c.linkStatus !== "removed"
);

const allCommunities: Community[] = groupsData as Community[];
const pendingCommunities: Community[] = pendingData as Community[];

/**
 * Returns all communities in the published dataset.
 */
export function getAllCommunities(): Community[] {
  return allCommunities;
}

/**
 * Returns only actively published communities (excluding removed ones).
 */
export function getPublishedCommunities(): Community[] {
  return publishedCommunities;
}

/**
 * Returns pending communities in the moderation queue.
 */
export function getPendingCommunities(): Community[] {
  return pendingCommunities;
}

/**
 * Finds a community by its unique slug.
 */
export function getCommunityBySlug(slug: string): Community | undefined {
  return publishedCommunities.find((c) => c.slug === slug);
}

/**
 * Finds a community by its unique ID.
 */
export function getCommunityById(id: string): Community | undefined {
  return publishedCommunities.find((c) => c.id === id);
}

/**
 * Returns communities matching a specific category slug.
 */
export function getCommunitiesByCategory(category: string): Community[] {
  return publishedCommunities.filter((c) => c.category === category);
}

/**
 * Returns communities matching a specific platform ID.
 */
export function getCommunitiesByPlatform(platform: PlatformId | string): Community[] {
  return publishedCommunities.filter((c) => c.platform === platform);
}

/**
 * Returns communities containing a specific tag (case-insensitive).
 */
export function getCommunitiesByTag(tag: string): Community[] {
  const normalizedTag = tag.toLowerCase().trim();
  return publishedCommunities.filter((c) =>
    c.tags.some((t) => t.toLowerCase() === normalizedTag)
  );
}

/**
 * Deterministically finds related communities based on:
 * 1. Category match
 * 2. Overlapping tags count
 * 3. Platform match
 * 4. Language match
 * Excludes the current community and caps at limit.
 */
export function getRelatedCommunities(
  current: Community,
  limit: number = 4
): Community[] {
  const others = publishedCommunities.filter((c) => c.id !== current.id);

  const scored = others.map((candidate) => {
    let score = 0;

    // Category match (high relevance)
    if (candidate.category === current.category) {
      score += 10;
    }

    // Subcategory match
    if (
      current.subcategory &&
      candidate.subcategory &&
      current.subcategory.toLowerCase() === candidate.subcategory.toLowerCase()
    ) {
      score += 8;
    }

    // Overlapping tags
    const currentTags = new Set(current.tags.map((t) => t.toLowerCase()));
    for (const tag of candidate.tags) {
      if (currentTags.has(tag.toLowerCase())) {
        score += 4;
      }
    }

    // Platform match
    if (candidate.platform === current.platform) {
      score += 2;
    }

    // Language match
    if (current.language && candidate.language === current.language) {
      score += 1;
    }

    return { candidate, score };
  });

  // Sort descending by score, then by latest discovered
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.candidate.discoveredAt).getTime() - new Date(a.candidate.discoveredAt).getTime();
  });

  return scored.slice(0, limit).map((s) => s.candidate);
}

/**
 * Returns the most recently added published communities.
 */
export function getRecentlyAdded(limit: number = 8): Community[] {
  return [...publishedCommunities]
    .sort(
      (a, b) =>
        new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime()
    )
    .slice(0, limit);
}

/**
 * Returns communities sorted by last link health check date.
 */
export function getRecentlyChecked(limit: number = 8): Community[] {
  return [...publishedCommunities]
    .filter((c) => Boolean(c.lastCheckedAt))
    .sort(
      (a, b) =>
        new Date(b.lastCheckedAt || 0).getTime() -
        new Date(a.lastCheckedAt || 0).getTime()
    )
    .slice(0, limit);
}

/**
 * Returns featured editorially curated communities.
 */
export function getFeaturedCommunities(limit: number = 6): Community[] {
  const featured = publishedCommunities.filter((c) => c.featured);
  if (featured.length >= limit) {
    return featured.slice(0, limit);
  }
  // Fallback to recently added if fewer featured exist
  const remaining = getRecentlyAdded(limit - featured.length);
  const combined = [...featured, ...remaining.filter((r) => !featured.some((f) => f.id === r.id))];
  return combined.slice(0, limit);
}

/**
 * Computes all unique tags across published communities with their count.
 */
export function getAllTagsWithCounts(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const comm of publishedCommunities) {
    for (const tag of comm.tags) {
      const normalized = tag.toLowerCase().trim();
      if (normalized) {
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Returns true real stats computed from datasets for the homepage counters.
 */
export function getDatasetStats() {
  const publishedCount = publishedCommunities.length;
  const pendingCount = pendingCommunities.length;

  const platformCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  let activeLinks = 0;
  let unknownLinks = 0;
  let deadLinks = 0;

  for (const c of publishedCommunities) {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;

    if (c.linkStatus === "active") activeLinks++;
    else if (c.linkStatus === "unknown") unknownLinks++;
    else if (c.linkStatus === "dead") deadLinks++;
  }

  return {
    totalPublished: publishedCount,
    totalPending: pendingCount,
    platforms: platformCounts,
    categories: categoryCounts,
    activeLinks,
    unknownLinks,
    deadLinks,
  };
}
