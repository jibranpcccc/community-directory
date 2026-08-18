import { describe, it, expect } from "vitest";
import { filterAndSortCommunities, sortCommunities } from "../src/lib/filters";
import { searchCommunities } from "../src/lib/search";
import type { Community } from "../src/types/community";

const sampleList: Community[] = [
  {
    id: "alpha-ai",
    slug: "alpha-ai",
    title: "Alpha AI Builders",
    platform: "telegram",
    category: "ai-tech",
    tags: ["ai", "python"],
    inviteUrl: "https://t.me/alpha_ai",
    description: "Building machine learning tools.",
    memberCount: 5000,
    verificationStatus: "source-confirmed",
    linkStatus: "active",
    sourceUrls: ["https://example.com"],
    discoveryMethod: "manual",
    discoveredAt: "2026-08-10T10:00:00.000Z",
    lastCheckedAt: "2026-08-18T10:00:00.000Z",
    published: true,
  },
  {
    id: "beta-crypto",
    slug: "beta-crypto",
    title: "Beta Crypto Discussion",
    platform: "discord",
    category: "crypto-web3",
    tags: ["crypto", "defi"],
    inviteUrl: "https://discord.gg/beta_crypto",
    description: "DeFi protocols and Ethereum talk.",
    memberCount: 2000,
    verificationStatus: "unverified",
    linkStatus: "active",
    sourceUrls: ["https://example.com"],
    discoveryMethod: "manual",
    discoveredAt: "2026-08-15T10:00:00.000Z",
    lastCheckedAt: "2026-08-12T10:00:00.000Z",
    published: true,
  },
  {
    id: "gamma-forex",
    slug: "gamma-forex",
    title: "Gamma Forex Traders",
    platform: "whatsapp",
    category: "forex-stocks",
    tags: ["forex", "gold"],
    inviteUrl: "https://chat.whatsapp.com/gamma",
    description: "Technical analysis for currency pairs.",
    memberCount: null,
    verificationStatus: "manually-reviewed",
    linkStatus: "dead",
    sourceUrls: ["https://example.com"],
    discoveryMethod: "manual",
    discoveredAt: "2026-08-17T10:00:00.000Z",
    lastCheckedAt: "2026-08-18T12:00:00.000Z",
    published: true,
  },
];

describe("Filters, Search, and Sorting", () => {
  it("filters by platform", () => {
    const res = filterAndSortCommunities(sampleList, { platform: "telegram" });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("alpha-ai");
  });

  it("filters by category", () => {
    const res = filterAndSortCommunities(sampleList, { category: "crypto-web3" });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("beta-crypto");
  });

  it("performs tokenized text search", () => {
    const res = searchCommunities(sampleList, "machine learning");
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("alpha-ai");
  });

  it("sorts by newest discovered date", () => {
    const sorted = sortCommunities(sampleList, "newest");
    expect(sorted[0].id).toBe("gamma-forex");
    expect(sorted[2].id).toBe("alpha-ai");
  });

  it("sorts by member count (sourced only)", () => {
    const sorted = sortCommunities(sampleList, "member-count");
    expect(sorted[0].id).toBe("alpha-ai"); // 5000
    expect(sorted[1].id).toBe("beta-crypto"); // 2000
    expect(sorted[2].id).toBe("gamma-forex"); // null (-1)
  });

  it("sorts alphabetically", () => {
    const sorted = sortCommunities(sampleList, "alphabetical");
    expect(sorted[0].title).toBe("Alpha AI Builders");
    expect(sorted[1].title).toBe("Beta Crypto Discussion");
    expect(sorted[2].title).toBe("Gamma Forex Traders");
  });
});
