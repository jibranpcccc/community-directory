import { describe, it, expect } from "vitest";
import {
  CommunitySchema,
  CountryCodeSchema,
  validateCommunitiesData,
} from "../scripts/data/validateSchema";
import { ENABLED_COUNTRIES, TARGET_COUNTRIES, type CountryCode } from "../src/config/countries";

describe("Deterministic 14 Target Markets Schema Validation", () => {
  const all14Markets: CountryCode[] = [
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

  it("verifies that exactly 14 target markets are defined in the system", () => {
    expect(all14Markets.length).toBe(14);
    expect(ENABLED_COUNTRIES.length).toBe(14);
    expect(Object.keys(TARGET_COUNTRIES).length).toBe(14);
  });

  it("validates CountryCodeSchema accepts every single one of the 14 market codes", () => {
    for (const code of all14Markets) {
      const parsed = CountryCodeSchema.safeParse(code);
      expect(parsed.success, `CountryCodeSchema rejected valid market code: ${code}`).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toBe(code);
      }
    }
  });

  it("rejects unsupported country codes that are not in the 14 approved target markets", () => {
    const unsupported = ["FR", "ES", "BR", "JP", "IT", "MX", "RU", "CN", "PK", "BD"];
    for (const code of unsupported) {
      const parsed = CountryCodeSchema.safeParse(code);
      expect(parsed.success, `CountryCodeSchema unexpectedly allowed unsupported code: ${code}`).toBe(false);
    }
  });

  it("successfully parses a representative valid Community record for EVERY one of the 14 markets through CommunitySchema", () => {
    for (const code of all14Markets) {
      const countryConfig = TARGET_COUNTRIES[code];
      const sampleRecord = {
        id: `sample-${countryConfig.slug}-jobs-community`,
        slug: `sample-${countryConfig.slug}-jobs-community`,
        title: `${countryConfig.name} Tech & Career Jobs`,
        platform: "discord",
        vertical: "jobs",
        category: "tech-jobs",
        subcategory: "Software Engineering",
        tags: ["jobs", "tech", countryConfig.slug],
        inviteUrl: `https://discord.gg/sample-${countryConfig.slug}`,
        description: `Active public Discord community sharing verified tech and software engineering job alerts in ${countryConfig.name}.`,
        descriptionSource: "confirmed-source",
        language: "en",
        country: countryConfig.name,
        countryCode: code,
        city: countryConfig.cities[0] || null,
        countryEvidence: {
          sourceType: "independent-source",
          text: `Community based in ${countryConfig.name}`,
          sourceUrl: `https://example.com/${countryConfig.slug}`,
          checkedAt: new Date().toISOString(),
        },
        jobTypes: ["full-time-jobs", "remote-jobs"],
        industries: ["technology"],
        workArrangement: "remote",
        experienceLevels: ["mid-level", "senior"],
        visaSponsorship: "unknown",
        accessType: "free",
        communityType: "jobs",
        memberCount: 1500,
        memberCountSource: `https://discord.gg/sample-${countryConfig.slug}`,
        memberCountCheckedAt: new Date().toISOString(),
        verificationStatus: "source-confirmed",
        linkStatus: "active",
        lastKnownLinkStatus: "active",
        lastSuccessfulValidationAt: new Date().toISOString(),
        sourceUrls: [`https://example.com/${countryConfig.slug}`],
        sourceCheckedAt: new Date().toISOString(),
        sourceVerification: {
          status: "confirmed",
          checkedAt: new Date().toISOString(),
          sourceUrl: `https://example.com/${countryConfig.slug}`,
          inviteUrl: `https://discord.gg/sample-${countryConfig.slug}`,
          matchedBy: "exact-href",
          matchedGuildId: "123456789012345678",
          evidenceSnippet: `Official Discord community for ${countryConfig.name} tech jobs`,
        },
        discoveryMethod: "gemini-search",
        discoveredAt: new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        safetyFlags: [],
        guildId: "123456789012345678",
        published: true,
        featured: false,
      };

      const parseResult = CommunitySchema.safeParse(sampleRecord);
      expect(
        parseResult.success,
        `CommunitySchema failed for market ${code}: ${
          !parseResult.success ? JSON.stringify(parseResult.error.errors) : ""
        }`
      ).toBe(true);
    }
  });

  it("validates a batch containing all 14 markets through the production validateCommunitiesData function", () => {
    const records = all14Markets.map((code) => {
      const countryConfig = TARGET_COUNTRIES[code];
      return {
        id: `batch-${countryConfig.slug}-jobs`,
        slug: `batch-${countryConfig.slug}-jobs`,
        title: `${countryConfig.name} Hiring Alerts`,
        platform: "telegram",
        vertical: "jobs",
        category: "remote-jobs",
        subcategory: "Remote Work",
        tags: ["jobs", "alerts", countryConfig.slug],
        inviteUrl: `https://t.me/jobs_${countryConfig.slug.replace(/-/g, "_")}`,
        description: `Daily employment alerts and job opportunities in ${countryConfig.name}.`,
        descriptionSource: "platform",
        language: "en",
        country: countryConfig.name,
        countryCode: code,
        city: null,
        countryEvidence: {
          sourceType: "platform-title",
          text: `${countryConfig.name} Hiring Alerts`,
          checkedAt: new Date().toISOString(),
        },
        jobTypes: ["remote-jobs"],
        industries: [],
        workArrangement: "remote",
        experienceLevels: [],
        visaSponsorship: "unknown",
        accessType: "free",
        communityType: "jobs",
        memberCount: 500,
        memberCountSource: `https://t.me/jobs_${countryConfig.slug.replace(/-/g, "_")}`,
        memberCountCheckedAt: new Date().toISOString(),
        verificationStatus: "unverified",
        linkStatus: "active",
        lastKnownLinkStatus: "active",
        lastSuccessfulValidationAt: new Date().toISOString(),
        sourceUrls: [`https://t.me/jobs_${countryConfig.slug.replace(/-/g, "_")}`],
        sourceCheckedAt: null,
        sourceVerification: null,
        discoveryMethod: "gemini-search",
        discoveredAt: new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        safetyFlags: [],
        guildId: null,
        published: true,
        featured: false,
        publicationTier: "B",
      };
    });

    const validationResult = validateCommunitiesData(records);
    expect(validationResult.valid, `validateCommunitiesData failed: ${validationResult.errors.join("; ")}`).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
    expect(validationResult.communities).toHaveLength(14);
  });
});
