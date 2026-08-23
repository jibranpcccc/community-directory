import { siteConfig } from "../config/site";
import { getCanonicalUrl } from "./seo";
import type { Community } from "../types/community";

export interface BreadcrumbItem {
  name: string;
  item: string;
}

/**
 * Generates factual WebSite JSON-LD schema for JobAlertHub.
 * Sitelinks searchbox / SearchAction is intentionally omitted per modern Google guidelines.
 */
export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: getCanonicalUrl("/"),
    description: siteConfig.description,
  };
}

/**
 * Generates BreadcrumbList JSON-LD schema matching visible hierarchy.
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  const allItems =
    items.length > 0 && items[0].item === "/"
      ? items
      : [{ name: "Home", item: "/" }, ...items];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: getCanonicalUrl(crumb.item),
    })),
  };
}

/**
 * Generates CollectionPage / ItemList JSON-LD schema for category/platform directory pages.
 */
export function generateCollectionPageSchema(
  name: string,
  description: string,
  urlPath: string,
  communities: Community[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: getCanonicalUrl(urlPath),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: communities.length,
      itemListElement: communities.map((comm, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: comm.title,
        url: getCanonicalUrl(`/group/${comm.slug}`),
      })),
    },
  };
}

/**
 * Generates Organization JSON-LD schema strictly for JobAlertHub itself (the directory publisher).
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: getCanonicalUrl("/"),
    logo: getCanonicalUrl("/favicon.svg"),
    description: siteConfig.description,
    sameAs: [siteConfig.links.github],
  };
}

/**
 * Generates factual WebPage schema for an individual community listing.
 * Strictly avoids assigning unsupported Organization schemas or fake JobPosting/Review/Rating schemas.
 */
export function generateCommunityDetailSchema(community: Community) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${community.title} (${community.platform})`,
    description: community.description || `${community.title} public job alert community.`,
    url: getCanonicalUrl(`/group/${community.slug}`),
    datePublished: community.discoveredAt,
    dateModified: community.updatedAt || community.lastCheckedAt || community.discoveredAt,
    about: {
      "@type": "Thing",
      name: community.title,
    },
  };
}
