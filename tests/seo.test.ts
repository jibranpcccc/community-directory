import { describe, it, expect } from "vitest";
import {
  getCanonicalUrl,
  formatPageTitle,
  getSeoMetadata,
  getIndexability,
  isCommunityIndexWorthy,
} from "../src/lib/seo";
import {
  generateWebSiteSchema,
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  generateOrganizationSchema,
  generateCommunityDetailSchema,
} from "../src/lib/schema";
import { siteConfig } from "../src/config/site";
import type { Community } from "../src/types/community";

describe("SEO Engine & JSON-LD Generators", () => {
  const baseUrl = siteConfig.url.replace(/\/+$/, "");

  describe("Canonical URL Generation", () => {
    it("generates correct root canonical URL with trailing slash", () => {
      expect(getCanonicalUrl("/")).toBe(`${baseUrl}/`);
      expect(getCanonicalUrl("")).toBe(`${baseUrl}/`);
    });

    it("generates normalized path canonical URLs with trailing slashes", () => {
      expect(getCanonicalUrl("/category/tech-jobs")).toBe(`${baseUrl}/category/tech-jobs/`);
      expect(getCanonicalUrl("/category/tech-jobs/")).toBe(`${baseUrl}/category/tech-jobs/`);
      expect(getCanonicalUrl("jobs")).toBe(`${baseUrl}/jobs/`);
      expect(getCanonicalUrl("/jobs/")).toBe(`${baseUrl}/jobs/`);
    });

    it("preserves static asset file extensions without trailing slashes", () => {
      expect(getCanonicalUrl("/favicon.svg")).toBe(`${baseUrl}/favicon.svg`);
      expect(getCanonicalUrl("/robots.txt")).toBe(`${baseUrl}/robots.txt`);
    });
  });

  describe("Page Title Formatting", () => {
    it("formats default page title", () => {
      expect(formatPageTitle()).toBe(`${siteConfig.name} - ${siteConfig.tagline}`);
    });

    it("formats page specific title with branding suffix", () => {
      expect(formatPageTitle("Tech Job Alert Groups")).toBe(`Tech Job Alert Groups | ${siteConfig.name}`);
    });

    it("avoids duplicate branding if title already contains site name", () => {
      expect(formatPageTitle(`Tech Jobs on ${siteConfig.name}`)).toBe(`Tech Jobs on ${siteConfig.name}`);
    });
  });

  describe("Indexation Gating (Thresholds & Thin Content Control)", () => {
    it("returns true for home, jobs catalog, trust pages, and published groups", () => {
      expect(getIndexability("home", 0)).toBe(true);
      expect(getIndexability("jobs", 0)).toBe(true);
      expect(getIndexability("trust", 0)).toBe(true);
      expect(getIndexability("group", 1)).toBe(true);
    });

    it("enforces noindex for thin taxonomy pages with 0 to 4 listings", () => {
      expect(getIndexability("country", 0)).toBe(false);
      expect(getIndexability("country", 1)).toBe(false);
      expect(getIndexability("country", 4)).toBe(false);
      expect(getIndexability("category", 0)).toBe(false);
      expect(getIndexability("category", 3)).toBe(false);
      expect(getIndexability("platform", 0)).toBe(false);
      expect(getIndexability("job-type", 2)).toBe(false);
    });

    it("enforces index eligibility for country, category, platform, and job-type with 5 or more listings", () => {
      expect(getIndexability("country", 5)).toBe(true);
      expect(getIndexability("country", 10)).toBe(true);
      expect(getIndexability("category", 5)).toBe(true);
      expect(getIndexability("platform", 6)).toBe(true);
      expect(getIndexability("job-type", 5)).toBe(true);
    });

    it("permanently enforces noindex for tag pages regardless of count (0, 5, 50)", () => {
      expect(getIndexability("tag", 0)).toBe(false);
      expect(getIndexability("tag", 5)).toBe(false);
      expect(getIndexability("tag", 50)).toBe(false);
    });

    it("enforces noindex for utility, legal, success, and 404 pages", () => {
      expect(getIndexability("utility", 10)).toBe(false);
      expect(getIndexability("legal", 10)).toBe(false);
      expect(getIndexability("404", 0)).toBe(false);
    });
  });

  describe("Community Detail SEO Qualification (15 Conditions)", () => {
    const baseCommunity: Community = {
      id: "northerndev-discord",
      slug: "northerndev-formerly-tech-career-north-discord",
      title: "NorthernDev (formerly Tech Career North)",
      platform: "discord",
      vertical: "jobs",
      category: "tech-jobs",
      countryCode: "CA",
      city: "Toronto",
      jobTypes: ["remote-jobs", "full-time-jobs"],
      industries: ["technology"],
      workArrangement: "remote",
      experienceLevels: ["mid-level", "senior"],
      visaSponsorship: "unknown",
      tags: ["canada", "tech-jobs"],
      inviteUrl: "https://discord.gg/northerndev",
      description: "Canadian tech community sharing career and hiring discussions.",
      descriptionSource: "platform",
      verificationStatus: "source-confirmed",
      linkStatus: "active",
      sourceUrls: ["https://northern.dev"],
      sourceVerification: {
        status: "confirmed",
        checkedAt: "2026-08-19T04:00:00.000Z",
        sourceUrl: "https://northern.dev",
        inviteUrl: "https://discord.gg/northerndev",
        matchedBy: "exact-href",
      },
      countryEvidence: {
        sourceType: "platform-title",
        text: "NorthernDev Canadian Tech",
        checkedAt: "2026-08-19T04:00:00.000Z",
      },
      discoveryMethod: "manual",
      discoveredAt: "2026-08-01T00:00:00.000Z",
      lastSuccessfulValidationAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      published: true,
    };

    it("returns true for a fully compliant, verified active community", () => {
      expect(isCommunityIndexWorthy(baseCommunity)).toBe(true);
    });

    it("rejects unpublished community", () => {
      expect(isCommunityIndexWorthy({ ...baseCommunity, published: false })).toBe(false);
    });

    it("rejects dead or removed links", () => {
      expect(isCommunityIndexWorthy({ ...baseCommunity, linkStatus: "dead" })).toBe(false);
      expect(isCommunityIndexWorthy({ ...baseCommunity, linkStatus: "removed" })).toBe(false);
    });

    it("rejects non-job verticals", () => {
      expect(isCommunityIndexWorthy({ ...baseCommunity, vertical: "crypto" as any })).toBe(false);
    });

    it("rejects non-approved target markets", () => {
      expect(isCommunityIndexWorthy({ ...baseCommunity, countryCode: "FR" as any })).toBe(false);
    });

    it("rejects stale validation age > 30 days", () => {
      const staleDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
      expect(isCommunityIndexWorthy({ ...baseCommunity, lastSuccessfulValidationAt: staleDate })).toBe(false);
    });

    it("rejects safety flags and scam language", () => {
      expect(isCommunityIndexWorthy({ ...baseCommunity, safetyFlags: ["scam-risk"] })).toBe(false);
    });

    it("rejects unverified tier B communities lacking source-confirmed domain evidence", () => {
      expect(isCommunityIndexWorthy({ ...baseCommunity, verificationStatus: "unverified" })).toBe(false);
    });
  });

  describe("SEO Metadata Helper", () => {
    it("generates correct Open Graph and Twitter tags with trailing slashes", () => {
      const meta = getSeoMetadata({
        title: "Canada Job Alert Groups",
        description: "Find active job communities in Canada.",
        canonicalPath: "/country/canada/",
        noindex: true,
        pageType: "country",
      });

      expect(meta.title).toBe(`Canada Job Alert Groups | ${siteConfig.name}`);
      expect(meta.description).toBe("Find active job communities in Canada.");
      expect(meta.canonicalUrl).toBe(`${baseUrl}/country/canada/`);
      expect(meta.imageUrl).toBe(`${baseUrl}/favicon.svg`);
      expect(meta.noindex).toBe(true);
    });
  });

  describe("Structured Data Schema Generators", () => {
    it("generates valid Organization JSON-LD schema for JobAlertHub publisher", () => {
      const schema = generateOrganizationSchema();
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Organization");
      expect(schema.name).toBe(siteConfig.name);
      expect(schema.url).toBe(`${baseUrl}/`);
      expect(schema.logo).toBe(`${baseUrl}/favicon.svg`);
    });

    it("generates factual WebSite JSON-LD schema without SearchAction", () => {
      const schema = generateWebSiteSchema();
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("WebSite");
      expect(schema.name).toBe(siteConfig.name);
      expect(schema.url).toBe(`${baseUrl}/`);
      expect((schema as any).potentialAction).toBeUndefined();
    });

    it("generates valid BreadcrumbList JSON-LD schema with trailing slashes", () => {
      const breadcrumbs = [
        { name: "All Jobs", item: "/jobs/" },
        { name: "Canada", item: "/country/canada/" },
      ];

      const schema = generateBreadcrumbSchema(breadcrumbs);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("BreadcrumbList");
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0].item).toBe(`${baseUrl}/jobs/`);
      expect(schema.itemListElement[1].item).toBe(`${baseUrl}/country/canada/`);
    });

    it("generates valid CollectionPage JSON-LD schema for category directories", () => {
      const mockCommunities: Community[] = [
        {
          id: "astro-discord",
          slug: "astro-lounge-discord",
          title: "Astro Lounge",
          platform: "discord",
          vertical: "jobs",
          category: "tech-jobs",
          countryCode: "GB",
          city: "London",
          jobTypes: ["remote-jobs"],
          industries: ["technology"],
          workArrangement: "remote",
          experienceLevels: ["mid-level"],
          visaSponsorship: "unknown",
          tags: ["astro", "webdev"],
          inviteUrl: "https://discord.gg/astro",
          verificationStatus: "source-confirmed",
          linkStatus: "active",
          sourceUrls: ["https://astro.build"],
          discoveryMethod: "manual",
          discoveredAt: "2026-08-18T10:00:00.000Z",
          published: true,
        },
      ];

      const schema = generateCollectionPageSchema(
        "Tech Job Alert Groups",
        "List of verified Tech Jobs communities",
        "/category/tech-jobs/",
        mockCommunities
      );

      expect(schema["@type"]).toBe("CollectionPage");
      expect(schema.mainEntity.itemListElement).toHaveLength(1);
      expect(schema.mainEntity.itemListElement[0].url).toBe(`${baseUrl}/group/astro-lounge-discord/`);
    });

    it("generates factual CommunityDetail WebPage schema without unsupported Organization identity", () => {
      const community: Community = {
        id: "northerndev-discord",
        slug: "northerndev-formerly-tech-career-north-discord",
        title: "NorthernDev (formerly Tech Career North)",
        platform: "discord",
        vertical: "jobs",
        category: "tech-jobs",
        countryCode: "CA",
        city: "Toronto",
        jobTypes: ["remote-jobs", "full-time-jobs"],
        industries: ["technology"],
        workArrangement: "remote",
        experienceLevels: ["mid-level", "senior"],
        visaSponsorship: "unknown",
        tags: ["canada", "tech-jobs"],
        inviteUrl: "https://discord.gg/northerndev",
        description: "Canadian tech community sharing career and hiring discussions.",
        verificationStatus: "source-confirmed",
        linkStatus: "active",
        sourceUrls: ["https://northern.dev"],
        discoveryMethod: "manual",
        discoveredAt: "2026-08-01T00:00:00.000Z",
        lastCheckedAt: "2026-08-19T04:00:00.000Z",
        published: true,
      };

      const schema = generateCommunityDetailSchema(community);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("WebPage");
      expect(schema.name).toBe("NorthernDev (formerly Tech Career North) (discord)");
      expect(schema.url).toBe(`${baseUrl}/group/northerndev-formerly-tech-career-north-discord/`);
      expect((schema as any).mainEntity).toBeUndefined(); // Informal chat communities are NOT typed as Organization
      expect(schema.about).toEqual({
        "@type": "Thing",
        name: "NorthernDev (formerly Tech Career North)",
      });

      // Verify no forbidden schemas exist
      const schemaString = JSON.stringify(schema);
      expect(schemaString).not.toContain("JobPosting");
      expect(schemaString).not.toContain("AggregateRating");
      expect(schemaString).not.toContain("Review");
      expect(schemaString).not.toContain("Product");
      expect(schemaString).not.toContain("FAQPage");
    });
  });
});
