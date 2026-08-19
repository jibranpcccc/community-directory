import { siteConfig } from "../config/site";

export type PageType =
  | "home"
  | "jobs"
  | "country"
  | "category"
  | "platform"
  | "job-type"
  | "tag"
  | "group"
  | "trust"
  | "utility"
  | "404";

export interface SeoProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  pageType?: PageType;
}

/**
 * Returns whether a page is eligible for search engine indexing based on its type and published inventory count.
 * Threshold: 5+ published listings required for programmatic taxonomy pages to prevent thin content indexing.
 */
export function getIndexability(pageType: PageType, publishedCount: number = 0): boolean {
  switch (pageType) {
    case "home":
    case "jobs":
    case "trust":
      return true;
    case "group":
      return true; // published community detail page
    case "country":
    case "category":
    case "platform":
    case "job-type":
    case "tag":
      return publishedCount >= siteConfig.taxonomyMinCommunitiesForIndex;
    case "utility":
    case "404":
    default:
      return false; // noindex for forms, success pages, error pages, thin utilities
  }
}

/**
 * Returns the absolute canonical URL for a given path.
 * Normalizes host from siteConfig.url and enforces single trailing-slash policy (no trailing slash except root).
 */
export function getCanonicalUrl(path: string = "/"): string {
  const base = siteConfig.url.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const cleanPath = normalizedPath === "/" ? "" : normalizedPath.replace(/\/+$/, "");
  return `${base}${cleanPath}`;
}

/**
 * Builds formatted, natural, page-specific page titles adhering to SEO standards.
 */
export function formatPageTitle(pageTitle?: string, pageType?: PageType): string {
  if (!pageTitle) {
    return `${siteConfig.name} — ${siteConfig.tagline}`;
  }
  // If title already includes site name or is home, avoid double branding
  if (pageTitle.includes(siteConfig.name)) {
    return pageTitle;
  }
  return `${pageTitle} | ${siteConfig.name}`;
}

/**
 * Returns formatted SEO metadata with fallbacks and indexation rules.
 */
export function getSeoMetadata({
  title,
  description,
  canonicalPath = "/",
  image = "/favicon.svg",
  type = "website",
  noindex = false,
  pageType = "home",
}: SeoProps) {
  const fullTitle = formatPageTitle(title, pageType);
  const metaDescription = description || siteConfig.description;
  const canonicalUrl = getCanonicalUrl(canonicalPath);
  const imageUrl = image.startsWith("http")
    ? image
    : `${siteConfig.url.replace(/\/+$/, "")}${image.startsWith("/") ? image : `/${image}`}`;

  return {
    title: fullTitle,
    description: metaDescription,
    canonicalUrl,
    imageUrl,
    type,
    noindex,
    siteName: siteConfig.name,
  };
}
