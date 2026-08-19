import { describe, it, expect } from "vitest";
import { evaluateAutoPublishCandidate, runAutoPublish } from "../scripts/data/autoPublish";
import type { Community, ArchivedCommunity } from "../src/types/community";
import { getCurrentIsoTimestamp } from "../src/lib/dates";

describe("Autonomous Publication Engine - Evaluation Gates & Tiers", () => {
  const now = getCurrentIsoTimestamp();

  const baseCandidate: Community = {
    id: "test-cand",
    slug: "test-cand",
    title: "Canada Tech Jobs & Careers",
    platform: "discord",
    vertical: "jobs",
    category: "tech-jobs",
    tags: ["tech", "careers", "canada"],
    inviteUrl: "https://discord.gg/canada-tech-jobs",
    description: "Official tech jobs and developer hiring network across Canada.",
    country: "Canada",
    countryCode: "CA",
    city: "Toronto",
    countryEvidence: {
      sourceType: "official-source",
      text: "Canada Tech Careers",
      sourceUrl: "https://canadatech.ca",
      checkedAt: now,
    },
    jobTypes: ["full-time-jobs", "internships"],
    industries: ["technology"],
    workArrangement: "remote",
    experienceLevels: ["entry-level", "mid-level"],
    visaSponsorship: "unknown",
    verificationStatus: "source-confirmed",
    linkStatus: "active",
    sourceUrls: ["https://canadatech.ca"],
    discoveryMethod: "gemini-search",
    discoveredAt: now,
    lastCheckedAt: now,
    published: false,
    guildId: "123456789012345678",
  };

  it("Gate A: Active + source-confirmed + CA jobs + no risk -> Qualifies for Tier A auto-publish", () => {
    const evalResult = evaluateAutoPublishCandidate(baseCandidate, []);
    expect(evalResult.tier).toBe("A");
    expect(evalResult.eligible).toBe(true);
    expect(evalResult.blockedReasons).toHaveLength(0);
    expect(evalResult.passedGates).toContain("tier-a-source-confirmed");
  });

  it("Gate B: Active + no country evidence -> BLOCKED (Tier C)", () => {
    const noCountryCand: Community = {
      ...baseCandidate,
      country: null,
      countryCode: null,
      countryEvidence: null,
      title: "Global Tech Hiring Hub",
      description: "Chat with developers worldwide.",
    };
    const evalResult = evaluateAutoPublishCandidate(noCountryCand, []);
    expect(evalResult.tier).toBe("C");
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.blockedReasons.some((r) => r.includes("country"))).toBe(true);
  });

  it("Gate C: Active + crypto signals / disallowed niche -> BLOCKED", () => {
    const cryptoCand: Community = {
      ...baseCandidate,
      title: "Crypto Signals & Bitcoin Trading VIP",
      description: "Daily pump calls and trading signals.",
    };
    const evalResult = evaluateAutoPublishCandidate(cryptoCand, []);
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.blockedReasons.some((r) => r.includes("insufficient-job-intent"))).toBe(true);
  });

  it("Gate D: Active + severe scam -> BLOCKED", () => {
    const scamCand: Community = {
      ...baseCandidate,
      title: "Daily Task Income Community",
      description: "Pay $50 registration fee to unlock high-paying video liking tasks.",
    };
    const evalResult = evaluateAutoPublishCandidate(scamCand, []);
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.blockedReasons.some((r) => r.includes("scam-risk-flags"))).toBe(true);
  });

  it("Gate E: Unknown link status -> BLOCKED from auto-publish", () => {
    const unknownCand: Community = {
      ...baseCandidate,
      linkStatus: "unknown",
    };
    const evalResult = evaluateAutoPublishCandidate(unknownCand, []);
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.blockedReasons).toContain("link-status-unknown");
  });

  it("Gate F: Dead link -> BLOCKED from auto-publish", () => {
    const deadCand: Community = {
      ...baseCandidate,
      linkStatus: "dead",
    };
    const evalResult = evaluateAutoPublishCandidate(deadCand, []);
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.blockedReasons).toContain("link-status-dead");
  });

  it("Gate G: Duplicate Discord guildId -> BLOCKED", () => {
    const publishedGroup: Community = {
      ...baseCandidate,
      id: "existing-hub",
      slug: "existing-hub",
      inviteUrl: "https://discord.gg/different-invite-code",
      guildId: "123456789012345678", // Same Guild ID
      published: true,
    };
    const evalResult = evaluateAutoPublishCandidate(baseCandidate, [publishedGroup]);
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.blockedReasons.some((r) => r.includes("duplicate"))).toBe(true);
  });

  it("Gate H: Active unverified candidate observed by 2 independent providers -> Qualifies for Tier B", () => {
    const multiProviderCand: Community = {
      ...baseCandidate,
      verificationStatus: "unverified",
      sourceUrls: [],
      providerIds: ["gemini-search", "tavily-search"],
      timesSeen: 1,
    };
    const evalResult = evaluateAutoPublishCandidate(multiProviderCand, []);
    expect(evalResult.tier).toBe("B");
    expect(evalResult.eligible).toBe(true);
    expect(evalResult.passedGates.some((g) => g.includes("tier-b-multi-provider"))).toBe(true);
  });

  it("Gate I: Active unverified candidate observed across 2 separate runs -> Qualifies for Tier B", () => {
    const multiRunCand: Community = {
      ...baseCandidate,
      verificationStatus: "unverified",
      sourceUrls: [],
      providerIds: ["gemini-search"],
      observedRunIds: ["run_1", "run_2"], // Seen across 2 runs
      timesSeen: 2,
    };
    const evalResult = evaluateAutoPublishCandidate(multiRunCand, []);
    expect(evalResult.tier).toBe("B");
    expect(evalResult.eligible).toBe(true);
    expect(evalResult.passedGates.some((g) => g.includes("tier-b-multi-run-observation"))).toBe(true);
  });

  it("Gate J: Generic worldwide remote jobs without Tier-1 evidence -> BLOCKED", () => {
    const worldwideCand: Community = {
      ...baseCandidate,
      title: "Remote Jobs Worldwide & Global Discussion",
      description: "Find remote opportunities around the globe.",
      countryCode: null,
      countryEvidence: null,
    };
    const evalResult = evaluateAutoPublishCandidate(worldwideCand, []);
    expect(evalResult.eligible).toBe(false);
  });

  it("Gate K: Stale validation age (>24h) -> BLOCKED until revalidated", () => {
    const staleTime = new Date(Date.now() - 36 * 3600 * 1000).toISOString(); // 36 hours ago
    const staleCand: Community = {
      ...baseCandidate,
      lastCheckedAt: staleTime,
    };
    const evalResult = evaluateAutoPublishCandidate(staleCand, [], [], {
      maxValidationAgeHours: 24,
      tierBRequiredObservations: 2,
    });
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.blockedReasons.some((r) => r.includes("validation-stale"))).toBe(true);
  });
});
