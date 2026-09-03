import { siteConfig } from "../config/site";
import type { Community } from "../types/community";

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
  | "legal"
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

const APPROVED_MARKETS = [
  "GLOBAL",
  "US",
  "GB",
  "CA",
  "AU",
  "IN",
  "DE",
  "NL",
  "SG",
  "AE",
  "PH",
  "NZ",
  "IE",
  "ZA",
];

const INACTIVE_TITLE_REGEX = /\b(inactive|shut\s+down|closed\s+down|deleted\s+server|server\s+closed|no\s+longer\s+active)\b/i;
const JOB_INTENT_REGEX = /\b(job|jobs|hiring|career|careers|intern|internship|internships|graduate|employment|recruitment|vacancy|vacancies|work|developer|engineer|nurse|nursing|accounting|sales)\b/i;
const SCAM_REGEX = /\b(guaranteed\s+profit|100%\s+win|double\s+your\s+money|task\s+rating|usdt\s+deposit|pay\s+upfront|registration\s+fee)\b/i;

/**
 * Strict 15-Point SEO Indexability Gate for Community Detail Pages.
 * A community detail page may be index, follow ONLY when all 15 conditions pass.
 * If useful for visitors but unverified/thin: PUBLIC = YES, BROWSEABLE = YES, but noindex, follow.
 */
export function isCommunityIndexWorthy(community: Community): boolean {
  // 1. Published must be true
  if (!community.published) return false;

  // 2. Link status must be active
  if (community.linkStatus !== "active") return false;

  // 3. Sufficiently fresh validation (within 30 days)
  if (!community.lastSuccessfulValidationAt) return false;
  const validationAgeDays =
    (Date.now() - new Date(community.lastSuccessfulValidationAt).getTime()) /
    (1000 * 3600 * 24);
  if (validationAgeDays > 30) return false;

  // 4. Strong jobs/career/hiring intent
  if (community.vertical !== "jobs") return false;

  // 5. Market is one of the 14 approved target markets
  if (!community.countryCode || !APPROVED_MARKETS.includes(community.countryCode)) {
    return false;
  }

  // 6. Supported platform: Discord / Telegram / WhatsApp
  const approvedPlatforms = ["discord", "telegram", "whatsapp"];
  if (!approvedPlatforms.includes(community.platform)) return false;

  // 7. Valid market evidence present
  if (!community.countryEvidence || !community.countryEvidence.text) return false;

  // 8. No scam/fraud violation
  if (community.safetyFlags && community.safetyFlags.length > 0) return false;
  const fullText = `${community.title} ${community.description || ""} ${(community.tags || []).join(" ")}`;
  if (SCAM_REGEX.test(fullText)) return false;

  // 9. Valid canonical slug
  if (!community.slug || !/^[a-z0-9-]+$/.test(community.slug)) return false;

  // 10. Title validity (length >= 3 and active)
  if (!community.title || community.title.trim().length < 3) return false;
  if (INACTIVE_TITLE_REGEX.test(community.title)) return false;

  // 11. Strong employment intent in title or description
  if (!JOB_INTENT_REGEX.test(fullText)) return false;

  // 12. Provenance for description
  if (community.description && community.description.trim().length > 0) {
    const validDescSources = ["platform", "confirmed-source", "platform-title", "platform-description", "independent-source"];
    if (community.descriptionSource && !validDescSources.includes(community.descriptionSource)) {
      return false;
    }
  }

  // 13. Source-confirmed claims backed by actual verified domain sources
  if (community.verificationStatus === "source-confirmed") {
    if (
      !community.sourceVerification ||
      community.sourceVerification.status !== "confirmed" ||
      !community.sourceUrls ||
      community.sourceUrls.length === 0
    ) {
      return false;
    }
  }

  // 14. Member count provenance when displayed
  if (typeof community.memberCount === "number" && community.memberCount > 0) {
    if (!community.memberCountSource) return false;
  }

  // 15. Substantive unique information & trust tier
  // Tier B unverified listings lacking confirmed independent source verification
  // are retained as public for directory users, but kept noindex, follow to protect SEO.
  const isHighTrust = ["source-confirmed", "owner-confirmed", "manually-reviewed"].includes(
    community.verificationStatus
  );
  if (!isHighTrust) {
    return false;
  }

  return true;
}

/**
 * Robust Indexability Gate for Taxonomy Aggregation Hubs (Country, Category, Platform, Job-Type).
 * A collection hub qualifies for indexing when it contains >= 5 safe, active, revalidated listings
 * meeting all vertical, freshness, scam-protection, and market rules.
 */
export function isCommunityIndexWorthyForTaxonomy(community: Community): boolean {
  // 1. Published must be true
  if (!community.published) return false;

  // 2. Link status must be active
  if (community.linkStatus !== "active") return false;

  // 3. Sufficiently fresh validation (within 30 days)
  if (!community.lastSuccessfulValidationAt) return false;
  const validationAgeDays =
    (Date.now() - new Date(community.lastSuccessfulValidationAt).getTime()) /
    (1000 * 3600 * 24);
  if (validationAgeDays > 30) return false;

  // 4. Strong jobs/career/hiring intent
  if (community.vertical !== "jobs") return false;

  // 5. Market is one of the 14 approved target markets
  if (!community.countryCode || !APPROVED_MARKETS.includes(community.countryCode)) {
    return false;
  }

  // 6. Supported platform: Discord / Telegram / WhatsApp
  const approvedPlatforms = ["discord", "telegram", "whatsapp"];
  if (!approvedPlatforms.includes(community.platform)) return false;

  // 7. Valid market evidence present
  if (!community.countryEvidence || !community.countryEvidence.text) return false;

  // 8. No scam/fraud violation
  if (community.safetyFlags && community.safetyFlags.length > 0) return false;
  const fullText = `${community.title} ${community.description || ""} ${(community.tags || []).join(" ")}`;
  if (SCAM_REGEX.test(fullText)) return false;

  // 9. Valid canonical slug
  if (!community.slug || !/^[a-z0-9-]+$/.test(community.slug)) return false;

  // 10. Title validity (length >= 3 and active)
  if (!community.title || community.title.trim().length < 3) return false;
  if (INACTIVE_TITLE_REGEX.test(community.title)) return false;

  // 11. Strong employment intent in title or description
  if (!JOB_INTENT_REGEX.test(fullText)) return false;

  return true;
}

/**
 * Returns whether a page is eligible for search engine indexing based on its type and SEO-qualified inventory count.
 * Gating Rules:
 * - Home, Jobs catalog, Trust pages: eligible (true).
 * - Country, Category, Platform, Job-Type: require >= 5 SEO-QUALIFIED active listings.
 * - Legal pages (/privacy/, /terms/, /disclaimer/): noindex, follow (false).
 * - Tags: PERMANENTLY NOINDEX (false).
 * - Utility, success, and 404 pages: PERMANENTLY NOINDEX (false).
 */
export function getIndexability(
  pageType: PageType,
  seoEligibleCount: number = 0
): boolean {
  switch (pageType) {
    case "home":
    case "jobs":
    case "trust":
      return true;
    case "group":
      return true;
    case "country":
    case "category":
    case "platform":
    case "job-type":
      return seoEligibleCount >= siteConfig.taxonomyMinCommunitiesForIndex;
    case "legal":
    case "tag":
    case "utility":
    case "404":
    default:
      return false;
  }
}

/**
 * Returns the absolute canonical URL for a given path.
 * Enforces Trailing Slash Canonical Policy (root / has trailing slash, all subpages have trailing slash).
 */
export function getCanonicalUrl(path: string = "/"): string {
  const base = siteConfig.url.replace(/\/+$/, "");
  if (!path || path === "/" || path === "") {
    return `${base}/`;
  }
  const clean = path.startsWith("/") ? path : `/${path}`;
  // Do not append trailing slash to files with extensions (e.g. /favicon.svg, /robots.txt)
  if (/\.[a-zA-Z0-9]+$/.test(clean)) {
    return `${base}${clean}`;
  }
  const withSlash = clean.endsWith("/") ? clean : `${clean}/`;
  return `${base}${withSlash}`;
}

/**
 * Builds formatted, natural, page-specific page titles adhering to SEO standards.
 */
export function formatPageTitle(pageTitle?: string, pageType?: PageType): string {
  if (!pageTitle) {
    return `${siteConfig.name} - ${siteConfig.tagline}`;
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
