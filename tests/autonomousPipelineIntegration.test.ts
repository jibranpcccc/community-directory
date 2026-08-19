import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { evaluateAutoPublishCandidate, runAutoPublish, validateCountryEvidence, COUNTRY_GEO_PATTERNS } from "../scripts/data/autoPublish";
import { runRevalidatePublished } from "../scripts/data/revalidatePublished";
import { stageDiscoveredCandidates } from "../scripts/data/mergeStaging";
import * as jobRiskModule from "../scripts/safety/jobRiskClassifier";
import type { Community, ArchivedCommunity } from "../src/types/community";
import { getCurrentIsoTimestamp } from "../src/lib/dates";

describe("Autonomous Pipeline Integration Test Suite (Zero-Maintenance Production Hardened)", () => {
  let tempDir: string;
  let groupsPath: string;
  let pendingPath: string;
  let rejectedPath: string;
  let archivedPath: string;

  const now = getCurrentIsoTimestamp();
  const testPublishConfig = {
    enabled: true,
    dryRun: false,
    maxPerRun: 5,
    maxValidationAgeHours: 24,
    requireTargetCountry: true,
    requireStrongJobIntent: true,
    rejectSevereRisk: true,
    probationEnabled: true,
    probationMaxDays: 7,
    tierBRequiredObservations: 2,
    autoUnpublishUnknownAfter: 3,
    platformWeights: { discord: 0.5, telegram: 0.35, whatsapp: 0.15 },
    countryWeights: { US: 0.4, GB: 0.25, CA: 0.2, AU: 0.15 },
  };

  const createSampleCandidate = (overrides: Partial<Community> = {}): Community => ({
    id: "sample-cand-ca",
    slug: "sample-cand-ca",
    title: "Canada Tech Jobs & Hiring Hub",
    platform: "discord",
    vertical: "jobs",
    category: "tech-jobs",
    tags: ["tech", "jobs"],
    inviteUrl: "https://discord.gg/sample-ca-hub",
    description: "Developer jobs, hiring alerts, and careers across Canada.",
    descriptionSource: "platform",
    country: "Canada",
    countryCode: "CA",
    city: null,
    countryEvidence: {
      sourceType: "platform-title",
      text: "Canada Tech Jobs & Hiring Hub",
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
    guildId: "888888888888888888",
    memberCount: 2500,
    memberCountSource: "https://discord.gg/sample-ca-hub",
    memberCountCheckedAt: now,
    ...overrides,
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-dir-test-"));
    groupsPath = path.join(tempDir, "groups.json");
    pendingPath = path.join(tempDir, "pending-groups.json");
    rejectedPath = path.join(tempDir, "rejected-candidates.json");
    archivedPath = path.join(tempDir, "archived-groups.json");

    fs.writeFileSync(groupsPath, "[]", "utf-8");
    fs.writeFileSync(pendingPath, "[]", "utf-8");
    fs.writeFileSync(rejectedPath, "[]", "utf-8");
    fs.writeFileSync(archivedPath, "[]", "utf-8");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  // ==========================================
  // 1. US COUNTRY REGEX TESTS (Fix Pronoun Bug)
  // ==========================================
  describe("1. US Country Regex Verification", () => {
    it("Rejects pronoun 'us' in 'Join us for tech jobs'", () => {
      const cand = createSampleCandidate({
        title: "Join us for tech jobs",
        description: "Community discussion",
        countryCode: "US",
        countryEvidence: null,
      });
      const val = validateCountryEvidence(cand);
      expect(val.isValid).toBe(false);
    });

    it("Rejects pronoun 'us' in 'Connect with us for remote jobs'", () => {
      const cand = createSampleCandidate({
        title: "Global Careers",
        description: "Connect with us for remote jobs",
        countryCode: "US",
        countryEvidence: null,
      });
      const val = validateCountryEvidence(cand);
      expect(val.isValid).toBe(false);
    });

    it("Passes explicit 'USA Tech Jobs'", () => {
      const cand = createSampleCandidate({
        title: "USA Tech Jobs",
        countryCode: "US",
        countryEvidence: null,
      });
      const val = validateCountryEvidence(cand);
      expect(val.isValid).toBe(true);
    });

    it("Passes 'United States Software Careers'", () => {
      const cand = createSampleCandidate({
        title: "United States Software Careers",
        countryCode: "US",
        countryEvidence: null,
      });
      const val = validateCountryEvidence(cand);
      expect(val.isValid).toBe(true);
    });

    it("Passes 'American Nursing Jobs'", () => {
      const cand = createSampleCandidate({
        title: "American Nursing Jobs",
        countryCode: "US",
        countryEvidence: null,
      });
      const val = validateCountryEvidence(cand);
      expect(val.isValid).toBe(true);
    });
  });

  // ==========================================
  // 2. DESCRIPTION PROVENANCE FAIL-CLOSED
  // ==========================================
  describe("2. Description Provenance Fail-Closed", () => {
    it("Blocks candidate if description exists but descriptionSource is missing", () => {
      const cand = createSampleCandidate({
        description: "Some description text without provenance",
        descriptionSource: undefined,
      });
      const evalRes = evaluateAutoPublishCandidate(cand, []);
      expect(evalRes.eligible).toBe(false);
      expect(evalRes.blockedReasons).toContain("missing-description-provenance");
    });

    it("Allows candidate if description is null", () => {
      const cand = createSampleCandidate({
        description: null,
        descriptionSource: null,
      });
      const evalRes = evaluateAutoPublishCandidate(cand, []);
      expect(evalRes.blockedReasons).not.toContain("missing-description-provenance");
    });

    it("Passes candidate with valid platform descriptionSource", () => {
      const cand = createSampleCandidate({
        description: "Verified platform description",
        descriptionSource: "platform",
      });
      const evalRes = evaluateAutoPublishCandidate(cand, []);
      expect(evalRes.passedGates).toContain("description-provenance-verified");
    });

    it("Passes candidate with valid confirmed-source descriptionSource", () => {
      const cand = createSampleCandidate({
        description: "Verified independent source description",
        descriptionSource: "confirmed-source",
      });
      const evalRes = evaluateAutoPublishCandidate(cand, []);
      expect(evalRes.passedGates).toContain("description-provenance-verified");
    });
  });

  // ==========================================
  // 3. TIER A PERSISTED SOURCE PROOF
  // ==========================================
  describe("3. Tier A Real Persisted Source Proof", () => {
    it("Tier A requires valid sourceVerification record with matching URL/guildId", () => {
      const validTierACand = createSampleCandidate({
        verificationStatus: "source-confirmed",
        sourceUrls: ["https://canadahire.ca"],
        sourceCheckedAt: now,
        sourceVerification: {
          status: "confirmed",
          checkedAt: now,
          sourceUrl: "https://canadahire.ca",
          inviteUrl: "https://discord.gg/sample-ca-hub",
          matchedBy: "exact-href",
          matchedGuildId: "888888888888888888",
        },
      });

      const evalRes = evaluateAutoPublishCandidate(validTierACand, []);
      expect(evalRes.tier).toBe("A");
      expect(evalRes.eligible).toBe(true);
    });

    it("Rejects Tier A if sourceVerification status is unverified/failed", () => {
      const invalidTierACand = createSampleCandidate({
        verificationStatus: "source-confirmed",
        sourceUrls: ["https://canadahire.ca"],
        sourceVerification: {
          status: "failed",
          checkedAt: now,
          sourceUrl: "https://canadahire.ca",
          inviteUrl: "https://discord.gg/sample-ca-hub",
          matchedBy: "exact-href",
        },
      });

      const evalRes = evaluateAutoPublishCandidate(invalidTierACand, []);
      expect(evalRes.tier).not.toBe("A");
    });

    it("Rejects Tier A if sourceVerification inviteUrl does not match candidate", () => {
      const mismatchCand = createSampleCandidate({
        verificationStatus: "source-confirmed",
        sourceUrls: ["https://canadahire.ca"],
        sourceVerification: {
          status: "confirmed",
          checkedAt: now,
          sourceUrl: "https://canadahire.ca",
          inviteUrl: "https://discord.gg/completely-different-guild",
          matchedBy: "exact-href",
          matchedGuildId: "999999999999999999",
        },
      });

      const evalRes = evaluateAutoPublishCandidate(mismatchCand, []);
      expect(evalRes.tier).not.toBe("A");
    });
  });

  // ==========================================
  // 4. SOURCE DOWNGRADE RE-EVALUATION
  // ==========================================
  describe("4. Source Downgrade Re-evaluation", () => {
    it("Source downgrade with 2 distinct run observations retains candidate as published Tier B", async () => {
      const publishedTierA = createSampleCandidate({
        published: true,
        verificationStatus: "source-confirmed",
        sourceUrls: ["https://stale-site.ca"],
        sourceCheckedAt: new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString(),
        observedRunIds: ["run_1", "run_2"], // 2 runs observed!
        providerIds: ["gemini-search"],
      });
      fs.writeFileSync(groupsPath, JSON.stringify([publishedTierA], null, 2), "utf-8");

      const mockValidators = {
        discordValidator: async () => ({
          url: publishedTierA.inviteUrl,
          status: "active" as const,
          checkedAt: new Date().toISOString(),
        }),
        sourceVerifier: async () => ({ isConfirmed: false }), // Source disappeared
      };

      const res = await runRevalidatePublished(testPublishConfig, tempDir, mockValidators);
      expect(res.activeRetained).toBe(1);
      expect(res.downgradedSourceCount).toBe(1);
      expect(res.autoUnpublished).toBe(0);

      const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
      expect(savedGroups[0].verificationStatus).toBe("unverified");
      expect(savedGroups[0].publicationTier).toBe("B");
    });

    it("Source downgrade without Tier B evidence auto-unpublishes and archives", async () => {
      const publishedTierAOnly = createSampleCandidate({
        published: true,
        verificationStatus: "source-confirmed",
        sourceUrls: ["https://stale-site.ca"],
        sourceCheckedAt: new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString(),
        observedRunIds: ["run_1"], // Only 1 run observation
        providerIds: ["gemini-search"], // Only 1 provider
      });
      fs.writeFileSync(groupsPath, JSON.stringify([publishedTierAOnly], null, 2), "utf-8");

      const mockValidators = {
        discordValidator: async () => ({
          url: publishedTierAOnly.inviteUrl,
          status: "active" as const,
          checkedAt: new Date().toISOString(),
        }),
        sourceVerifier: async () => ({ isConfirmed: false }), // Source disappeared
      };

      const res = await runRevalidatePublished(testPublishConfig, tempDir, mockValidators);
      expect(res.activeRetained).toBe(0);
      expect(res.autoUnpublished).toBe(1);

      const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
      const savedArchived: ArchivedCommunity[] = JSON.parse(fs.readFileSync(archivedPath, "utf-8"));

      expect(savedGroups).toHaveLength(0);
      expect(savedArchived).toHaveLength(1);
      expect(savedArchived[0].unpublishReason).toContain("source-downgraded-tier-b-ineligible");
    });
  });

  // ==========================================
  // 5. GLOBAL CRITICAL CIRCUIT BREAKER
  // ==========================================
  describe("5. Global Critical Circuit Breaker Fail-Closed", () => {
    it("Halts entire publication run (0 published) if a critical subsystem throws on any candidate", async () => {
      const candidate1 = createSampleCandidate({ id: "cand-1", title: "Canada Jobs 1", observedRunIds: ["r1", "r2"] });
      const candidate2 = createSampleCandidate({
        id: "cand-2",
        title: "Canada Jobs 2",
        verificationStatus: "source-confirmed",
        sourceUrls: ["https://source2.ca"],
        sourceVerification: {
          status: "confirmed",
          checkedAt: now,
          sourceUrl: "https://source2.ca",
          inviteUrl: "https://discord.gg/sample-ca-hub",
          matchedBy: "exact-href",
        },
      });

      fs.writeFileSync(pendingPath, JSON.stringify([candidate1, candidate2], null, 2), "utf-8");

      // Spy on classifyJobScamRisk to throw critical error on first evaluation
      vi.spyOn(jobRiskModule, "classifyJobScamRisk").mockImplementationOnce(() => {
        throw new Error("Critical Hardware/Parser Fault in Safety Engine");
      });

      const result = await runAutoPublish(testPublishConfig, tempDir);

      expect(result.circuitBreakerTriggered).toBe(true);
      expect(result.publishedCount).toBe(0); // ZERO published for the entire batch!

      const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
      expect(savedGroups).toHaveLength(0);
    });
  });

  // ==========================================
  // 6. REAL STAGING MERGE TESTS (observedRunIds & providerIds)
  // ==========================================
  describe("6. Real Discovery Staging Merge (Run IDs & Provider IDs)", () => {
    it("Aggregates observedRunIds across distinct runs using real stageDiscoveredCandidates", () => {
      const initialPending: Community[] = [];
      const cand = createSampleCandidate();

      // RUN A
      const { updatedPending: step1 } = stageDiscoveredCandidates(initialPending, [cand], "RUN_A", "gemini-search");
      expect(step1[0].observedRunIds).toEqual(["RUN_A"]);

      // Rediscover in same RUN A
      const { updatedPending: step2 } = stageDiscoveredCandidates(step1, [cand], "RUN_A", "gemini-search");
      expect(step2[0].observedRunIds).toEqual(["RUN_A"]); // Still size 1!

      // RUN B
      const { updatedPending: step3 } = stageDiscoveredCandidates(step2, [cand], "RUN_B", "gemini-search");
      expect(new Set(step3[0].observedRunIds).size).toBe(2);
      expect(step3[0].observedRunIds).toContain("RUN_A");
      expect(step3[0].observedRunIds).toContain("RUN_B");

      // Candidate now qualifies for Tier B
      const evalRes = evaluateAutoPublishCandidate(step3[0], []);
      expect(evalRes.tier).toBe("B");
      expect(evalRes.eligible).toBe(true);
    });

    it("Aggregates providerIds correctly across discovery calls", () => {
      const initialPending: Community[] = [];
      const cand = createSampleCandidate();

      // Gemini + Gemini -> size 1
      const { updatedPending: step1 } = stageDiscoveredCandidates(initialPending, [cand], "RUN_1", "gemini-search");
      const { updatedPending: step2 } = stageDiscoveredCandidates(step1, [cand], "RUN_1", "gemini-search");
      expect(new Set(step2[0].providerIds).size).toBe(1);

      // Gemini + Tavily -> size 2
      const { updatedPending: step3 } = stageDiscoveredCandidates(step2, [cand], "RUN_2", "tavily-search");
      expect(new Set(step3[0].providerIds).size).toBe(2);
      expect(step3[0].providerIds).toContain("gemini-search");
      expect(step3[0].providerIds).toContain("tavily-search");

      const evalRes = evaluateAutoPublishCandidate(step3[0], []);
      expect(evalRes.tier).toBe("B");
      expect(evalRes.eligible).toBe(true);
    });
  });

  // ==========================================
  // 7. BATCH DEDUPLICATION ACROSS ALL PLATFORMS
  // ==========================================
  describe("7. Batch Deduplication (Discord, Telegram, WhatsApp)", () => {
    it("Discord: Same guildId in same batch publishes only 1", async () => {
      const cand1 = createSampleCandidate({ id: "d1", inviteUrl: "https://discord.gg/vanity-1", guildId: "111222333" });
      const cand2 = createSampleCandidate({ id: "d2", inviteUrl: "https://discord.gg/vanity-2", guildId: "111222333" });

      cand1.observedRunIds = ["r1", "r2"];
      cand2.observedRunIds = ["r1", "r2"];

      fs.writeFileSync(pendingPath, JSON.stringify([cand1, cand2], null, 2), "utf-8");

      const res = await runAutoPublish(testPublishConfig, tempDir);
      expect(res.publishedCount).toBe(1);
    });

    it("Telegram: Same handle in same batch publishes only 1", async () => {
      const cand1 = createSampleCandidate({
        id: "tg1",
        platform: "telegram",
        inviteUrl: "https://t.me/canada_tech_jobs",
        observedRunIds: ["r1", "r2"],
      });
      const cand2 = createSampleCandidate({
        id: "tg2",
        platform: "telegram",
        inviteUrl: "https://telegram.me/CANADA_TECH_JOBS",
        observedRunIds: ["r1", "r2"],
      });

      fs.writeFileSync(pendingPath, JSON.stringify([cand1, cand2], null, 2), "utf-8");

      const res = await runAutoPublish(testPublishConfig, tempDir);
      expect(res.publishedCount).toBe(1);
    });

    it("WhatsApp: Same invite code in same batch publishes only 1", async () => {
      const cand1 = createSampleCandidate({
        id: "wa1",
        platform: "whatsapp",
        inviteUrl: "https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv",
        observedRunIds: ["r1", "r2"],
      });
      const cand2 = createSampleCandidate({
        id: "wa2",
        platform: "whatsapp",
        inviteUrl: "https://chat.whatsapp.com/ABCDEFGHIJKLMnOpQrStUv",
        observedRunIds: ["r1", "r2"],
      });

      fs.writeFileSync(pendingPath, JSON.stringify([cand1, cand2], null, 2), "utf-8");

      const res = await runAutoPublish(testPublishConfig, tempDir);
      expect(res.publishedCount).toBe(1);
    });
  });

  // ==========================================
  // 8. CITY PROVENANCE
  // ==========================================
  describe("8. City Provenance", () => {
    it("Resets city to null if no factual city evidence is found", () => {
      const cand = createSampleCandidate({
        title: "Canada Tech Jobs",
        description: "General hiring",
        city: "Vancouver",
        cityEvidence: null,
      });

      const evalRes = evaluateAutoPublishCandidate(cand, []);
      expect(cand.city).toBeNull();
    });

    it("Retains city if factual city evidence exists in platform title", () => {
      const cand = createSampleCandidate({
        title: "Toronto Tech Jobs & Careers",
        city: "Toronto",
        cityEvidence: null,
      });

      const evalRes = evaluateAutoPublishCandidate(cand, []);
      expect(cand.city).toBe("Toronto");
      expect(cand.cityEvidence).toBeTruthy();
    });
  });
});
