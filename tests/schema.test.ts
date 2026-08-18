import { describe, it, expect } from "vitest";
import { CommunitySchema, validateCommunitiesData } from "../scripts/data/validateSchema";

describe("Schema Validation", () => {
  it("validates a properly formatted community record", () => {
    const validRecord = {
      id: "valid-id",
      slug: "valid-slug",
      title: "Valid Community",
      platform: "telegram",
      category: "ai-tech",
      subcategory: "Coding",
      tags: ["coding", "ai"],
      inviteUrl: "https://t.me/valid_chat",
      description: "A valid factual description.",
      language: "en",
      country: "us",
      accessType: "free",
      communityType: "discussion",
      verificationStatus: "source-confirmed",
      linkStatus: "active",
      sourceUrls: ["https://example.com/source"],
      discoveryMethod: "manual",
      discoveredAt: "2026-08-18T12:00:00.000Z",
      lastCheckedAt: "2026-08-18T12:00:00.000Z",
      published: true,
    };

    const parseResult = CommunitySchema.safeParse(validRecord);
    expect(parseResult.success).toBe(true);
  });

  it("rejects invalid platform or malformed slug", () => {
    const invalidRecord = {
      id: "invalid-record",
      slug: "Invalid Slug With Spaces!",
      title: "Test",
      platform: "unknown_platform",
      category: "ai-tech",
      tags: [],
      inviteUrl: "not-a-url",
      verificationStatus: "unverified",
      linkStatus: "active",
      sourceUrls: [],
      discoveryMethod: "manual",
      discoveredAt: "2026-08-18T12:00:00.000Z",
      published: true,
    };

    const parseResult = CommunitySchema.safeParse(invalidRecord);
    expect(parseResult.success).toBe(false);
  });

  it("detects duplicate IDs and URLs across batch validation", () => {
    const duplicates = [
      {
        id: "item-1",
        slug: "item-1",
        title: "Community One",
        platform: "telegram",
        category: "ai-tech",
        tags: [],
        inviteUrl: "https://t.me/duplicate_url",
        verificationStatus: "unverified",
        linkStatus: "active",
        sourceUrls: ["https://source.com"],
        discoveryMethod: "manual",
        discoveredAt: "2026-08-18T12:00:00.000Z",
        published: true,
      },
      {
        id: "item-1", // duplicate ID
        slug: "item-2",
        title: "Community Two",
        platform: "telegram",
        category: "ai-tech",
        tags: [],
        inviteUrl: "https://t.me/duplicate_url", // duplicate normalized URL
        verificationStatus: "unverified",
        linkStatus: "active",
        sourceUrls: ["https://source.com"],
        discoveryMethod: "manual",
        discoveredAt: "2026-08-18T12:00:00.000Z",
        published: true,
      },
    ];

    const result = validateCommunitiesData(duplicates);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate ID"))).toBe(true);
    expect(result.errors.some((e) => e.includes("Duplicate normalized invite URL"))).toBe(true);
  });
});
