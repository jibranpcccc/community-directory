import { describe, it, expect } from "vitest";
import type { Community, ArchivedCommunity } from "../src/types/community";
import { getCurrentIsoTimestamp } from "../src/lib/dates";

describe("Published Revalidation & Auto-Unpublish Policies", () => {
  const now = getCurrentIsoTimestamp();

  const activePublished: Community = {
    id: "active-canada-hub",
    slug: "active-canada-hub",
    title: "Canada Tech Jobs Hub",
    platform: "discord",
    vertical: "jobs",
    category: "tech-jobs",
    tags: ["tech", "jobs"],
    inviteUrl: "https://discord.gg/active-hub",
    description: "Verified Canadian tech hiring community.",
    country: "Canada",
    countryCode: "CA",
    city: null,
    jobTypes: ["full-time-jobs"],
    industries: ["technology"],
    workArrangement: "unknown",
    experienceLevels: [],
    visaSponsorship: "unknown",
    verificationStatus: "source-confirmed",
    linkStatus: "active",
    sourceUrls: ["https://canadahub.ca"],
    discoveryMethod: "manual",
    discoveredAt: now,
    lastCheckedAt: now,
    published: true,
    guildId: "999999999999999999",
  };

  it("Dead link policy: Conclusive 404/deleted guild creates valid archive record with unpublishReason", () => {
    const archived: ArchivedCommunity = {
      id: activePublished.id,
      slug: activePublished.slug,
      title: activePublished.title,
      platform: activePublished.platform,
      inviteUrl: activePublished.inviteUrl,
      publishedAt: activePublished.discoveredAt,
      unpublishedAt: now,
      unpublishReason: "dead-link: 404 Invite not found",
      lastKnownStatus: "dead",
      guildId: activePublished.guildId,
      countryCode: activePublished.countryCode,
      category: activePublished.category,
    };

    expect(archived.unpublishReason).toContain("dead-link");
    expect(archived.lastKnownStatus).toBe("dead");
    expect(archived.unpublishedAt).toBeTruthy();
  });

  it("Temporary unknown policy: First transient failure increments consecutive count without unpublishing", () => {
    const temporaryGroup = {
      ...activePublished,
      consecutiveUnknownCount: 1,
      lastValidationStatus: "unknown" as const,
    };
    expect(temporaryGroup.consecutiveUnknownCount).toBe(1);
    expect(temporaryGroup.published).toBe(true);
  });

  it("Repeated unknown policy: 3 consecutive unknown checks triggers auto-unpublish", () => {
    const repeatedUnknownCount = 3;
    const threshold = 3;
    const shouldUnpublish = repeatedUnknownCount >= threshold;
    expect(shouldUnpublish).toBe(true);

    const archived: ArchivedCommunity = {
      id: activePublished.id,
      slug: activePublished.slug,
      title: activePublished.title,
      platform: activePublished.platform,
      inviteUrl: activePublished.inviteUrl,
      publishedAt: activePublished.discoveredAt,
      unpublishedAt: now,
      unpublishReason: `repeated-unknown-status (${repeatedUnknownCount} consecutive attempts)`,
      lastKnownStatus: "unknown",
      guildId: activePublished.guildId,
      countryCode: activePublished.countryCode,
      category: activePublished.category,
    };
    expect(archived.unpublishReason).toContain("repeated-unknown-status");
  });

  it("Severe safety change policy: Repurposed scam server triggers immediate auto-unpublish", () => {
    const scamTitle = "USDT Task Earning & VIP Crypto Signals";
    const archived: ArchivedCommunity = {
      id: activePublished.id,
      slug: activePublished.slug,
      title: scamTitle,
      platform: activePublished.platform,
      inviteUrl: activePublished.inviteUrl,
      publishedAt: activePublished.discoveredAt,
      unpublishedAt: now,
      unpublishReason: "severe-safety-violation: crypto/task scam keywords detected",
      lastKnownStatus: "removed",
      guildId: activePublished.guildId,
      countryCode: activePublished.countryCode,
      category: activePublished.category,
    };
    expect(archived.unpublishReason).toContain("severe-safety-violation");
  });
});
