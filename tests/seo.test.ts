import { describe, it, expect } from "vitest";
import { getCanonicalUrl, formatPageTitle, getSeoMetadata } from "../src/lib/seo";
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  generateFAQSchema,
  generateCommunityDetailSchema,
} from "../src/lib/schema";
import { siteConfig } from "../src/config/site";
import type { Community } from "../src/types/community";

describe("SEO & Canonical URL Generation", () => {
  const baseUrl = siteConfig.url.replace(/\/+$/, "");

  it("builds absolute canonical URLs for root path", () => {
    expect(getCanonicalUrl()).toBe(baseUrl);
    expect(getCanonicalUrl("/")).toBe(baseUrl);
    expect(getCanonicalUrl("")).toBe(baseUrl);
  });

  it("builds canonical URLs for sub-paths with and without leading slash", () => {
    expect(getCanonicalUrl("/communities")).toBe(`${baseUrl}/communities`);
    expect(getCanonicalUrl("communities")).toBe(`${baseUrl}/communities`);
    expect(getCanonicalUrl("/category/ai-tech")).toBe(`${baseUrl}/category/ai-tech`);
    expect(getCanonicalUrl("category/crypto-web3")).toBe(`${baseUrl}/category/crypto-web3`);
  });

  it("strips trailing slashes from sub-paths to avoid duplicate canonical URLs", () => {
    expect(getCanonicalUrl("/communities/")).toBe(`${baseUrl}/communities`);
    expect(getCanonicalUrl("/group/python-discord///")).toBe(`${baseUrl}/group/python-discord`);
    expect(getCanonicalUrl("platform/telegram/")).toBe(`${baseUrl}/platform/telegram`);
  });

  it("formats page titles adhering to site branding standards", () => {
    // Default fallback
    expect(formatPageTitle()).toBe(`${siteConfig.name} — ${siteConfig.tagline}`);
    expect(formatPageTitle("")).toBe(`${siteConfig.name} — ${siteConfig.tagline}`);

    // Custom titles
    expect(formatPageTitle("Telegram Communities")).toBe(
      `Telegram Communities | ${siteConfig.name}`
    );
    expect(formatPageTitle("AI & Tech")).toBe(`AI & Tech | ${siteConfig.name}`);
  });

  it("generates comprehensive SEO and Open Graph metadata with fallbacks", () => {
    const defaultMeta = getSeoMetadata({});
    expect(defaultMeta.title).toBe(`${siteConfig.name} — ${siteConfig.tagline}`);
    expect(defaultMeta.description).toBe(siteConfig.description);
    expect(defaultMeta.canonicalUrl).toBe(baseUrl);
    expect(defaultMeta.imageUrl).toBe(`${baseUrl}/favicon.svg`);
    expect(defaultMeta.type).toBe("website");
    expect(defaultMeta.noindex).toBe(false);
    expect(defaultMeta.siteName).toBe(siteConfig.name);

    // Custom properties
    const customMeta = getSeoMetadata({
      title: "Explore Python Groups",
      description: "Find the best Python Discord and Telegram groups.",
      canonicalPath: "/category/ai-tech",
      image: "https://example.com/custom-og.jpg",
      type: "article",
      noindex: true,
    });

    expect(customMeta.title).toBe(`Explore Python Groups | ${siteConfig.name}`);
    expect(customMeta.description).toBe("Find the best Python Discord and Telegram groups.");
    expect(customMeta.canonicalUrl).toBe(`${baseUrl}/category/ai-tech`);
    expect(customMeta.imageUrl).toBe("https://example.com/custom-og.jpg");
    expect(customMeta.type).toBe("article");
    expect(customMeta.noindex).toBe(true);

    // Relative image path resolution
    const relativeImageMeta = getSeoMetadata({
      image: "assets/banner.png",
    });
    expect(relativeImageMeta.imageUrl).toBe(`${baseUrl}/assets/banner.png`);
  });
});

describe("JSON-LD Schema.org Generators", () => {
  const baseUrl = siteConfig.url.replace(/\/+$/, "");

  it("generates valid Organization JSON-LD schema", () => {
    const schema = generateOrganizationSchema();
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Organization");
    expect(schema.name).toBe(siteConfig.name);
    expect(schema.url).toBe(baseUrl);
    expect(schema.logo).toBe(`${baseUrl}/favicon.svg`);
    expect(schema.description).toBe(siteConfig.description);
    expect(schema.sameAs).toEqual([siteConfig.links.github]);
  });

  it("generates valid WebSite JSON-LD schema with search action", () => {
    const schema = generateWebSiteSchema();
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("WebSite");
    expect(schema.name).toBe(siteConfig.name);
    expect(schema.url).toBe(baseUrl);
    expect(schema.description).toBe(siteConfig.description);
    expect(schema.potentialAction).toBeDefined();
    expect(schema.potentialAction["@type"]).toBe("SearchAction");
    expect(schema.potentialAction.target["@type"]).toBe("EntryPoint");
    expect(schema.potentialAction.target.urlTemplate).toBe(
      `${baseUrl}/jobs?search={search_term_string}`
    );
    expect(schema.potentialAction["query-input"]).toBe("required name=search_term_string");
  });

  it("generates valid BreadcrumbList JSON-LD schema", () => {
    const breadcrumbs = [
      { name: "Home", item: "/" },
      { name: "Categories", item: "/#categories" },
      { name: "AI & Tech", item: "/category/ai-tech" },
    ];

    const schema = generateBreadcrumbSchema(breadcrumbs);
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toHaveLength(3);

    expect(schema.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: baseUrl,
    });
    expect(schema.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Categories",
      item: `${baseUrl}/#categories`,
    });
    expect(schema.itemListElement[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "AI & Tech",
      item: `${baseUrl}/category/ai-tech`,
    });
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
      {
        id: "python-telegram",
        slug: "python-developers-telegram",
        title: "Python Developers",
        platform: "telegram",
        vertical: "jobs",
        category: "tech-jobs",
        countryCode: "US",
        city: "San Francisco",
        jobTypes: ["remote-jobs", "full-time-jobs"],
        industries: ["technology"],
        workArrangement: "remote",
        experienceLevels: ["entry-level", "mid-level"],
        visaSponsorship: "unknown",
        tags: ["python"],
        inviteUrl: "https://t.me/pythongroup",
        verificationStatus: "unverified",
        linkStatus: "active",
        sourceUrls: ["https://python.org"],
        discoveryMethod: "manual",
        discoveredAt: "2026-08-18T10:00:00.000Z",
        published: true,
      },
    ];

    const schema = generateCollectionPageSchema(
      "Tech Jobs Communities",
      "List of verified Tech Jobs communities",
      "/category/tech-jobs",
      mockCommunities
    );

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("CollectionPage");
    expect(schema.name).toBe("Tech Jobs Communities");
    expect(schema.description).toBe("List of verified Tech Jobs communities");
    expect(schema.url).toBe(`${baseUrl}/category/tech-jobs`);
    expect(schema.mainEntity["@type"]).toBe("ItemList");
    expect(schema.mainEntity.numberOfItems).toBe(2);
    expect(schema.mainEntity.itemListElement).toHaveLength(2);
    expect(schema.mainEntity.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Astro Lounge",
      url: `${baseUrl}/group/astro-lounge-discord`,
    });
    expect(schema.mainEntity.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Python Developers",
      url: `${baseUrl}/group/python-developers-telegram`,
    });
  });

  it("generates valid FAQPage JSON-LD schema", () => {
    const faqs = [
      {
        question: "How do you verify communities?",
        answer: "We confirm presence on official websites or verify admin ownership.",
      },
      {
        question: "Is it free to list a community?",
        answer: "Yes, standard listing is completely free.",
      },
    ];

    const schema = generateFAQSchema(faqs);
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "How do you verify communities?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We confirm presence on official websites or verify admin ownership.",
      },
    });
  });

  it("generates factual CommunityDetail WebPage JSON-LD schema without fake ratings", () => {
    const community: Community = {
      id: "reactiflux-discord",
      slug: "reactiflux-discord",
      title: "Reactiflux",
      platform: "discord",
      vertical: "jobs",
      category: "tech-jobs",
      countryCode: "US",
      city: "San Francisco",
      jobTypes: ["remote-jobs"],
      industries: ["technology"],
      workArrangement: "remote",
      experienceLevels: ["mid-level", "senior"],
      visaSponsorship: "unknown",
      tags: ["react", "javascript"],
      inviteUrl: "https://discord.gg/reactiflux",
      description: "Chat community for React developers.",
      verificationStatus: "source-confirmed",
      linkStatus: "active",
      sourceUrls: ["https://reactiflux.com"],
      discoveryMethod: "manual",
      discoveredAt: "2026-08-01T00:00:00.000Z",
      lastCheckedAt: "2026-08-18T12:00:00.000Z",
      updatedAt: "2026-08-18T14:00:00.000Z",
      published: true,
    };

    const schema = generateCommunityDetailSchema(community);
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("WebPage");
    expect(schema.name).toBe("Reactiflux (discord)");
    expect(schema.description).toBe("Chat community for React developers.");
    expect(schema.url).toBe(`${baseUrl}/group/reactiflux-discord`);
    expect(schema.datePublished).toBe("2026-08-01T00:00:00.000Z");
    expect(schema.dateModified).toBe("2026-08-18T14:00:00.000Z");
    expect(schema.mainEntity["@type"]).toBe("Organization");
    expect(schema.mainEntity.name).toBe("Reactiflux");
    expect(schema.mainEntity.url).toBe("https://discord.gg/reactiflux");
    expect(schema.mainEntity.sameAs).toEqual(["https://reactiflux.com"]);

    // Test fallback dateModified and fallback description
    const minimalCommunity: Community = {
      id: "minimal",
      slug: "minimal",
      title: "Minimal Group",
      platform: "telegram",
      vertical: "jobs",
      category: "tech-jobs",
      countryCode: null,
      city: null,
      jobTypes: [],
      industries: [],
      workArrangement: "unknown",
      experienceLevels: [],
      visaSponsorship: "unknown",
      tags: [],
      inviteUrl: "https://t.me/minimal",
      verificationStatus: "unverified",
      linkStatus: "active",
      sourceUrls: [],
      discoveryMethod: "manual",
      discoveredAt: "2026-08-10T00:00:00.000Z",
      published: true,
    };

    const minimalSchema = generateCommunityDetailSchema(minimalCommunity);
    expect(minimalSchema.description).toBe("Minimal Group public online community.");
    expect(minimalSchema.dateModified).toBe("2026-08-10T00:00:00.000Z");
  });
});
