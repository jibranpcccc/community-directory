import { describe, it, expect } from "vitest";
import {
  getAllCommunities,
  getPublishedCommunities,
  getCommunityBySlug,
  getRelatedCommunities,
  getAllTagsWithCounts,
  getDatasetStats,
} from "../src/lib/communities";

describe("Communities Repository Layer", () => {
  it("loads published communities successfully", () => {
    const all = getAllCommunities();
    const published = getPublishedCommunities();
    expect(all.length).toBeGreaterThan(0);
    expect(published.length).toBeGreaterThan(0);
  });

  it("finds community by slug", () => {
    const comm = getCommunityBySlug("astro-lounge-discord");
    expect(comm).toBeDefined();
    expect(comm?.title).toBe("Astro Lounge");
    expect(comm?.platform).toBe("discord");
  });

  it("finds related communities based on category and tags", () => {
    const comm = getCommunityBySlug("astro-lounge-discord");
    if (!comm) throw new Error("Astro community not found");

    const related = getRelatedCommunities(comm, 2);
    expect(related.length).toBeLessThanOrEqual(2);
    // Shouldn't include itself
    expect(related.some((r) => r.id === comm.id)).toBe(false);
  });

  it("computes all unique tags with count", () => {
    const tags = getAllTagsWithCounts();
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0]).toHaveProperty("tag");
    expect(tags[0]).toHaveProperty("count");
  });

  it("computes accurate dataset stats", () => {
    const stats = getDatasetStats();
    expect(stats.totalPublished).toBeGreaterThan(0);
    expect(stats).toHaveProperty("platforms");
    expect(stats).toHaveProperty("categories");
    expect(stats.activeLinks).toBeGreaterThanOrEqual(0);
  });
});
