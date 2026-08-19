import { describe, it, expect } from "vitest";
import { filterAndSortCommunities, sortCommunities } from "../src/lib/filters";
import { searchCommunities } from "../src/lib/search";
import type { Community } from "../src/types/community";

const sampleList: Community[] = [
  {
    id: "alpha-jobs",
    slug: "alpha-jobs",
    title: "Alpha Tech Jobs",
    platform: "telegram",
    vertical: "jobs",
    category: "tech-jobs",
    countryCode: "US",
    city: "New York",
    jobTypes: ["remote-jobs", "full-time-jobs"],
    industries: ["technology"],
    workArrangement: "remote",
    experienceLevels: ["mid-level", "senior"],
    visaSponsorship: "unknown",
    tags: ["tech", "engineering"],
    inviteUrl: "https://t.me/alpha_jobs",
    description: "Software engineering and developer job openings.",
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
    id: "beta-remote",
    slug: "beta-remote",
    title: "Beta Remote Careers",
    platform: "discord",
    vertical: "jobs",
    category: "remote-jobs",
    countryCode: "GB",
    city: "London",
    jobTypes: ["remote-jobs"],
    industries: ["technology"],
    workArrangement: "remote",
    experienceLevels: ["entry-level", "mid-level"],
    visaSponsorship: "unknown",
    tags: ["remote", "careers"],
    inviteUrl: "https://discord.gg/beta_remote",
    description: "Remote work alerts and job vacancies.",
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
    id: "gamma-health",
    slug: "gamma-health",
    title: "Gamma Healthcare Jobs",
    platform: "whatsapp",
    vertical: "jobs",
    category: "healthcare-jobs",
    countryCode: "CA",
    city: "Toronto",
    jobTypes: ["full-time-jobs"],
    industries: ["healthcare-medical"],
    workArrangement: "onsite",
    experienceLevels: ["mid-level"],
    visaSponsorship: "unknown",
    tags: ["nursing", "healthcare"],
    inviteUrl: "https://chat.whatsapp.com/gamma_health",
    description: "Hospital and clinical healthcare jobs in Canada.",
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
    expect(res[0].id).toBe("alpha-jobs");
  });

  it("filters by category", () => {
    const res = filterAndSortCommunities(sampleList, { category: "remote-jobs" });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("beta-remote");
  });

  it("filters by country code", () => {
    const res = filterAndSortCommunities(sampleList, { countryCode: "CA" });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("gamma-health");
  });

  it("performs tokenized text search", () => {
    const res = searchCommunities(sampleList, "software engineering");
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("alpha-jobs");
  });

  it("sorts by newest discovered date", () => {
    const sorted = sortCommunities(sampleList, "newest");
    expect(sorted[0].id).toBe("gamma-health");
    expect(sorted[2].id).toBe("alpha-jobs");
  });

  it("sorts by member count (sourced only)", () => {
    const sorted = sortCommunities(sampleList, "member-count");
    expect(sorted[0].id).toBe("alpha-jobs"); // 5000
    expect(sorted[1].id).toBe("beta-remote"); // 2000
    expect(sorted[2].id).toBe("gamma-health"); // null (-1)
  });

  it("sorts alphabetically", () => {
    const sorted = sortCommunities(sampleList, "alphabetical");
    expect(sorted[0].title).toBe("Alpha Tech Jobs");
    expect(sorted[1].title).toBe("Beta Remote Careers");
    expect(sorted[2].title).toBe("Gamma Healthcare Jobs");
  });
});
