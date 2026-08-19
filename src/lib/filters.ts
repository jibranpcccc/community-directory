import type { Community, FilterOptions, SortOption } from "../types/community";
import { searchCommunities } from "./search";

/**
 * Filters an array of communities based on filter options.
 */
export function filterCommunities(
  communities: Community[],
  options: FilterOptions = {}
): Community[] {
  let result = [...communities];

  // 1. Text Search (if search term is provided)
  if (options.search && options.search.trim()) {
    result = searchCommunities(result, options.search);
  }

  // 2. Country Code Filter
  if (options.countryCode) {
    result = result.filter(
      (c) => c.countryCode === options.countryCode?.toUpperCase()
    );
  }

  // 3. Category Filter
  if (options.category) {
    const targetCat = options.category.toLowerCase();
    result = result.filter((c) => c.category.toLowerCase() === targetCat);
  }

  if (options.jobType) {
    const targetType = options.jobType.toLowerCase();
    result = result.filter(
      (c) =>
        c.category.toLowerCase() === targetType ||
        (c.jobTypes && c.jobTypes.some((jt) => jt.toLowerCase() === targetType))
    );
  }

  // 4. Industry Filter
  if (options.industry) {
    const targetInd = options.industry.toLowerCase();
    result = result.filter(
      (c) => c.industries && c.industries.some((ind) => ind.toLowerCase() === targetInd)
    );
  }

  // 5. Work Arrangement Filter
  if (options.workArrangement) {
    result = result.filter((c) => c.workArrangement === options.workArrangement);
  }

  // 6. Visa Sponsorship Filter
  if (options.visaSponsorship) {
    result = result.filter((c) => c.visaSponsorship === options.visaSponsorship);
  }

  // 7. Platform Filter
  if (options.platform) {
    result = result.filter((c) => c.platform === options.platform);
  }

  // 8. Tag Filter
  if (options.tag) {
    const targetTag = options.tag.toLowerCase().trim();
    result = result.filter((c) =>
      c.tags.some((t) => t.toLowerCase() === targetTag)
    );
  }

  // 9. Language Filter
  if (options.language) {
    result = result.filter(
      (c) => c.language?.toLowerCase() === options.language?.toLowerCase()
    );
  }

  // 10. Access Type Filter
  if (options.accessType) {
    result = result.filter((c) => c.accessType === options.accessType);
  }

  // 11. Verification Status Filter
  if (options.verificationStatus) {
    result = result.filter((c) => c.verificationStatus === options.verificationStatus);
  }

  // 12. Link Status Filter
  if (options.linkStatus) {
    result = result.filter((c) => c.linkStatus === options.linkStatus);
  }

  // 13. Featured
  if (options.featured !== undefined) {
    result = result.filter((c) => Boolean(c.featured) === options.featured);
  }

  return result;
}

/**
 * Filters and sorts an array of communities based on filter options and sorting criteria.
 */
export function filterAndSortCommunities(
  communities: Community[],
  options: FilterOptions = {},
  sort: SortOption = "newest"
): Community[] {
  const filtered = filterCommunities(communities, options);
  return sortCommunities(filtered, sort);
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
