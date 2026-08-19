import { describe, it, expect } from "vitest";
import { stageDiscoveredCandidates } from "../scripts/data/mergeStaging";
import { evaluateAutoPublishCandidate, validateCountryEvidence } from "../scripts/data/autoPublish";
import type { Community } from "../src/types/community";
import { getCurrentIsoTimestamp } from "../src/lib/dates";

describe("Production Discovery & Staging Pipeline Integration", () => {
  const now = getCurrentIsoTimestamp();

  const createSampleCandidate = (overrides: Partial<Community> = {}): Community => ({
    id: "sample-cand-uk",
    slug: "sample-cand-uk",
    title: "UK Tech & Developer Jobs",
    platform: "discord",
    vertical: "jobs",
    category: "tech-jobs",
    tags: ["tech", "jobs", "uk"],
    inviteUrl: "https://discord.gg/sample-uk-hub",
    description: "Verified developer and technology jobs across the United Kingdom.",
    descriptionSource: "platform",
    country: "United Kingdom",
    countryCode: "GB",
    city: "London",
    countryEvidence: {
      sourceType: "platform-title",
      text: "UK Tech & Developer Jobs",
      checkedAt: now,
    },
    jobTypes: ["full-time-jobs"],
    industries: ["technology"],
    workArrangement: "unknown",
    experienceLevels: ["entry-level"],
    visaSponsorship: "unknown",
    verificationStatus: "unverified",
    linkStatus: "active",
    lastKnownLinkStatus: "active",
    lastSuccessfulValidationAt: now,
    sourceUrls: [],
    discoveryMethod: "gemini-search",
    discoveredAt: now,
    lastCheckedAt: now,
    published: false,
    guildId: "777777777777777777",
    memberCount: 3200,
    memberCountSource: "https://discord.gg/sample-uk-hub",
    memberCountCheckedAt: now,
    ...overrides,
  });

  // ========================================================
  // 1. mergeStaging.ts WIRING & PRODUCTION EXECUTION PROOF
  // ========================================================
  describe("1. Real Discovery Staging Path (mergeStaging.ts)", () => {
    it("First discovery in RUN_A assigns observedRunIds = [RUN_A]", () => {
      const initialPending: Community[] = [];
      const newCand = createSampleCandidate();

      const { updatedPending } = stageDiscoveredCandidates(
        initialPending,
        [newCand],
        "RUN_A_12345",
        "gemini-search",
        now
      );

      expect(updatedPending).toHaveLength(1);
      expect(updatedPending[0].observedRunIds).toEqual(["RUN_A_12345"]);
      expect(updatedPending[0].providerIds).toEqual(["gemini-search"]);
      expect(updatedPending[0].timesSeen).toBe(1);
    });

    it("Rediscovery during same RUN_A deduplicates observedRunIds", () => {
      const initialPending: Community[] = [];
      const newCand = createSampleCandidate();

      const { updatedPending: step1 } = stageDiscoveredCandidates(
        initialPending,
        [newCand],
        "RUN_A_12345",
        "gemini-search",
        now
      );

      const { updatedPending: step2 } = stageDiscoveredCandidates(
        step1,
        [newCand],
        "RUN_A_12345",
        "gemini-search",
        now
      );

      expect(step2).toHaveLength(1);
      expect(step2[0].observedRunIds).toEqual(["RUN_A_12345"]);
      expect(step2[0].timesSeen).toBe(2);
    });

    it("Rediscovery in RUN_B aggregates observedRunIds = [RUN_A, RUN_B]", () => {
      const initialPending: Community[] = [];
      const newCand = createSampleCandidate();

      const { updatedPending: step1 } = stageDiscoveredCandidates(
        initialPending,
        [newCand],
        "RUN_A_12345",
        "gemini-search",
        now
      );

      const { updatedPending: step2 } = stageDiscoveredCandidates(
        step1,
        [newCand],
        "RUN_B_67890",
        "gemini-search",
        now
      );

      expect(step2).toHaveLength(1);
      expect(step2[0].observedRunIds).toHaveLength(2);
      expect(step2[0].observedRunIds).toContain("RUN_A_12345");
      expect(step2[0].observedRunIds).toContain("RUN_B_67890");

      // Candidate now qualifies for Tier B
      const evalRes = evaluateAutoPublishCandidate(step2[0], []);
      expect(evalRes.tier).toBe("B");
      expect(evalRes.eligible).toBe(true);
    });

    it("Discovery across distinct providers aggregates providerIds", () => {
      const initialPending: Community[] = [];
      const newCand = createSampleCandidate();

      const { updatedPending: step1 } = stageDiscoveredCandidates(
        initialPending,
        [newCand],
        "RUN_A_12345",
        "gemini-search",
        now
      );

      const { updatedPending: step2 } = stageDiscoveredCandidates(
        step1,
        [newCand],
        "RUN_A_12345",
        "tavily-search",
        now
      );

      expect(step2[0].providerIds).toHaveLength(2);
      expect(step2[0].providerIds).toContain("gemini-search");
      expect(step2[0].providerIds).toContain("tavily-search");

      // Candidate qualifies for Tier B by multi-provider evidence
      const evalRes = evaluateAutoPublishCandidate(step2[0], []);
      expect(evalRes.tier).toBe("B");
      expect(evalRes.eligible).toBe(true);
    });
  });

  // ========================================================
  // 2. DISCOVERY CREATES sourceVerification RECORD
  // ========================================================
  describe("2. Discovery Pipeline Persists sourceVerification", () => {
    it("Discovered candidate with confirmed outbound source receives full sourceVerification and qualifies for Tier A", () => {
      // Emulate candidate constructed by scripts/discover/index.ts lines 540-575
      const discoveredCandidate: Community = {
        ...createSampleCandidate(),
        verificationStatus: "source-confirmed",
        sourceUrls: ["https://uktechcareers.co.uk"],
        sourceCheckedAt: now,
        sourceVerification: {
          status: "confirmed",
          checkedAt: now,
          sourceUrl: "https://uktechcareers.co.uk",
          inviteUrl: "https://discord.gg/sample-uk-hub",
          matchedBy: "exact-href",
          matchedGuildId: "777777777777777777",
          evidenceSnippet: "Join our official Discord community for UK Tech Job Alerts",
        },
      };

      // Stage candidate into pending
      const { updatedPending } = stageDiscoveredCandidates(
        [],
        [discoveredCandidate],
        "RUN_DISCOVERY_PROD",
        "gemini-search",
        now
      );

      const staged = updatedPending[0];
      expect(staged.verificationStatus).toBe("source-confirmed");
      expect(staged.sourceVerification).toBeTruthy();
      expect(staged.sourceVerification?.status).toBe("confirmed");
      expect(staged.sourceVerification?.sourceUrl).toBe("https://uktechcareers.co.uk");
      expect(staged.sourceVerification?.inviteUrl).toBe("https://discord.gg/sample-uk-hub");
      expect(staged.sourceVerification?.matchedBy).toBe("exact-href");
      expect(staged.sourceVerification?.matchedGuildId).toBe("777777777777777777");

      // Evaluate for auto-publish
      const evalRes = evaluateAutoPublishCandidate(staged, []);
      expect(evalRes.tier).toBe("A");
      expect(evalRes.eligible).toBe(true);
      expect(evalRes.passedGates).toContain("tier-a-source-confirmed");
    });
  });

  // ========================================================
  // 3. HARDENED COUNTRY EVIDENCE TIMESTAMP/ORIGIN (FAIL-CLOSED)
  // ========================================================
  describe("3. Independent Country Evidence Fail-Closed Rules", () => {
    it("Fails independent source country evidence when checkedAt is missing", () => {
      const cand = createSampleCandidate({
        title: "Generic Jobs Network",
        description: "Hiring developers",
        countryEvidence: {
          sourceType: "independent-source",
          text: "UK Tech Careers",
          sourceUrl: "https://uktechcareers.co.uk",
          checkedAt: undefined as any, // Missing checkedAt
        },
      });

      const res = validateCountryEvidence(cand);
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain("missing sourceUrl or checkedAt");
    });

    it("Fails independent source country evidence when sourceUrl is missing", () => {
      const cand = createSampleCandidate({
        title: "Generic Jobs Network",
        description: "Hiring developers",
        countryEvidence: {
          sourceType: "independent-source",
          text: "UK Tech Careers",
          sourceUrl: undefined as any, // Missing sourceUrl
          checkedAt: now,
        },
      });

      const res = validateCountryEvidence(cand);
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain("missing sourceUrl or checkedAt");
    });

    it("Passes independent source country evidence when sourceType, text, sourceUrl, and checkedAt are all present", () => {
      const cand = createSampleCandidate({
        title: "Generic Jobs Network",
        description: "Hiring developers",
        countryEvidence: {
          sourceType: "independent-source",
          text: "UK Tech Careers Network",
          sourceUrl: "https://uktechcareers.co.uk",
          checkedAt: now,
        },
      });

      const res = validateCountryEvidence(cand);
      expect(res.isValid).toBe(true);
      expect(res.evidence?.sourceType).toBe("independent-source");
      expect(res.evidence?.checkedAt).toBe(now);
    });

    it("Passes platform-title country evidence with deterministic extraction timestamp", () => {
      const cand = createSampleCandidate({
        title: "Australia Tech Careers Hub",
        countryCode: "AU",
        countryEvidence: null,
      });

      const res = validateCountryEvidence(cand);
      expect(res.isValid).toBe(true);
      expect(res.evidence?.sourceType).toBe("platform-title");
      expect(res.evidence?.text).toBe("Australia Tech Careers Hub");
      expect(res.evidence?.checkedAt).toBeTruthy();
    });
  });
});
