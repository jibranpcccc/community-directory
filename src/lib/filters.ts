import type { Community, FilterOptions, SortOption } from "../types/community";
import { searchCommunities } from "./search";

/**
 * Filters and sorts an array of communities based on filter options and sorting criteria.
 */
export function filterAndSortCommunities(
  communities: Community[],
  options: FilterOptions = {},
  sort: SortOption = "newest"
): Community[] {
  let result = [...communities];

  // 1. Text Search (if search term is provided)
  if (options.search && options.search.trim()) {
    result = searchCommunities(result, options.search);
  }

  // 2. Category Filter
  if (options.category) {
    result = result.filter(
      (c) => c.category.toLowerCase() === options.category?.toLowerCase()
    );
  }

  // 3. Platform Filter
  if (options.platform) {
    result = result.filter((c) => c.platform === options.platform);
  }

  // 4. Tag Filter
  if (options.tag) {
    const targetTag = options.tag.toLowerCase().trim();
    result = result.filter((c) =>
      c.tags.some((t) => t.toLowerCase() === targetTag)
    );
  }

  // 5. Language Filter
  if (options.language) {
    result = result.filter(
      (c) => c.language?.toLowerCase() === options.language?.toLowerCase()
    );
  }

  // 6. Access Type Filter
  if (options.accessType) {
    result = result.filter((c) => c.accessType === options.accessType);
  }

  // 7. Verification Status Filter
  if (options.verificationStatus) {
    result = result.filter((c) => c.verificationStatus === options.verificationStatus);
  }

  // 8. Link Status Filter
  if (options.linkStatus) {
    result = result.filter((c) => c.linkStatus === options.linkStatus);
  }

  // 9. Community Type Filter
  if (options.communityType) {
    result = result.filter((c) => c.communityType === options.communityType);
  }

  // 10. Featured
  if (options.featured !== undefined) {
    result = result.filter((c) => Boolean(c.featured) === options.featured);
  }

  // Apply Sorting
  return sortCommunities(result, sort);
}

/**
 * Sorts communities deterministically based on verified fields.
 * Never uses fake ratings or invented growth metrics.
 */
export function sortCommunities(
  communities: Community[],
  sort: SortOption = "newest"
): Community[] {
  const list = [...communities];

  switch (sort) {
    case "recently-checked":
      return list.sort((a, b) => {
        const timeA = a.lastCheckedAt ? new Date(a.lastCheckedAt).getTime() : 0;
        const timeB = b.lastCheckedAt ? new Date(b.lastCheckedAt).getTime() : 0;
        return timeB - timeA;
      });

    case "alphabetical":
      return list.sort((a, b) => a.title.localeCompare(b.title));

    case "member-count":
      return list.sort((a, b) => {
        const countA = typeof a.memberCount === "number" ? a.memberCount : -1;
        const countB = typeof b.memberCount === "number" ? b.memberCount : -1;
        return countB - countA;
      });

    case "newest":
    default:
      return list.sort(
        (a, b) =>
          new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime()
      );
  }
}
