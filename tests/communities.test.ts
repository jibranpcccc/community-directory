import { describe, it, expect } from "vitest";
import {
  getAllCommunities,
  getPublishedCommunities,
  getCommunityBySlug,
  getRelatedCommunities,
  getAllTagsWithCounts,
  getDatasetStats,
} from "../src/lib/communities";

import type { Community } from "../src/types/community";

describe("Communities Repository Layer", () => {
  it("loads published communities dataset array", () => {
    const all = getAllCommunities();
    const published = getPublishedCommunities();
    expect(Array.isArray(all)).toBe(true);
    expect(Array.isArray(published)).toBe(true);
  });

  it("finds related communities excluding the target community itself", () => {
    const mockComm: Community = {
      id: "mock-job-1",
      slug: "mock-job-1",
      title: "Mock Tech Jobs",
      platform: "telegram",
      vertical: "jobs",
      category: "tech-jobs",
      countryCode: "US",
      city: "New York",
      jobTypes: ["remote-jobs"],
      industries: ["technology"],
      workArrangement: "remote" as const,
      experienceLevels: ["mid-level", "senior"],
      visaSponsorship: "unknown" as const,
      tags: ["tech", "remote"],
      inviteUrl: "https://t.me/mock_jobs",
      verificationStatus: "source-confirmed" as const,
      linkStatus: "active" as const,
      sourceUrls: ["https://example.com"],
      discoveryMethod: "manual" as const,
      discoveredAt: "2026-08-18T10:00:00.000Z",
      published: true,
    };

    const related = getRelatedCommunities(mockComm, 2);
    expect(related.some((r) => r.id === mockComm.id)).toBe(false);
  });

  it("computes all unique tags with count", () => {
    const tags = getAllTagsWithCounts();
    expect(Array.isArray(tags)).toBe(true);
  });

  it("computes accurate dataset stats", () => {
    const stats = getDatasetStats();
    expect(typeof stats.totalPublished).toBe("number");
    expect(stats).toHaveProperty("platforms");
    expect(stats).toHaveProperty("countries");
    expect(stats).toHaveProperty("categories");
    expect(stats.activeLinks).toBeGreaterThanOrEqual(0);
  });
});
