import { siteConfig } from "../config/site";
import { getCanonicalUrl } from "./seo";
import type { Community } from "../types/community";

export interface BreadcrumbItem {
  name: string;
  item: string;
}

/**
 * Generates WebSite JSON-LD schema with search action potential.
 */
export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: getCanonicalUrl("/"),
    description: siteConfig.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getCanonicalUrl("/jobs")}?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generates BreadcrumbList JSON-LD schema matching visible hierarchy.
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
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
 * Generates Organization JSON-LD schema for the site publisher.
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
 * Generates FAQPage JSON-LD schema for educational content.
 */
export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generates WebPage schema for individual community listing.
 * Strictly adheres to non-fabricated data; NO fake JobPosting, NO fake aggregateRating or product schema.
 */
export function generateCommunityDetailSchema(community: Community) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${community.title} (${community.platform})`,
    description: community.description || `${community.title} public online job community.`,
    url: getCanonicalUrl(`/group/${community.slug}`),
    datePublished: community.discoveredAt,
    dateModified: community.updatedAt || community.lastCheckedAt || community.discoveredAt,
    mainEntity: {
      "@type": "Organization",
      name: community.title,
      url: community.inviteUrl,
      sameAs: community.sourceUrls,
    },
  };
}
