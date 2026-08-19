import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { evaluateAutoPublishCandidate, runAutoPublish, validateCountryEvidence } from "../scripts/data/autoPublish";
import { runRevalidatePublished } from "../scripts/data/revalidatePublished";
import type { Community, ArchivedCommunity } from "../src/types/community";
import { getCurrentIsoTimestamp } from "../src/lib/dates";

describe("Autonomous Pipeline Integration Test Suite (Full End-to-End)", () => {
  let tempDir: string;
  let groupsPath: string;
  let pendingPath: string;
  let rejectedPath: string;
  let archivedPath: string;

  const now = getCurrentIsoTimestamp();

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
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("Test A: Probation Tier A -> runAutoPublish moves record from pending to published", async () => {
    const tierACand = createSampleCandidate({
      verificationStatus: "source-confirmed",
      sourceUrls: ["https://canadahire.ca"],
      sourceCheckedAt: now,
      descriptionSource: "confirmed-source",
    });

    fs.writeFileSync(pendingPath, JSON.stringify([tierACand], null, 2), "utf-8");

    const result = await runAutoPublish(
      {
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
      },
      tempDir
    );

    expect(result.publishedCount).toBe(1);
    expect(result.tierACount).toBe(1);

    const updatedPublished: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
    const updatedPending: Community[] = JSON.parse(fs.readFileSync(pendingPath, "utf-8"));

    expect(updatedPublished).toHaveLength(1);
    expect(updatedPublished[0].id).toBe(tierACand.id);
    expect(updatedPublished[0].published).toBe(true);
    expect(updatedPending).toHaveLength(0);
  });

  it("Test B: Tier B same candidate seen twice in the SAME run -> NOT eligible", () => {
    const sameRunCand = createSampleCandidate({
      verificationStatus: "unverified",
      sourceUrls: [],
      providerIds: ["gemini-search"],
      observedRunIds: ["run_123_abc", "run_123_abc"], // Same Run ID twice
    });

    const evalRes = evaluateAutoPublishCandidate(sameRunCand, [], [], {
      maxValidationAgeHours: 24,
      tierBRequiredObservations: 2,
    });

    expect(evalRes.tier).toBe("C");
    expect(evalRes.eligible).toBe(false);
    expect(evalRes.blockedReasons.some((r) => r.includes("tier-b-pending-observation"))).toBe(true);
  });

  it("Test C: Tier B candidate observed across TWO distinct runIds -> Eligible for publication", () => {
    const multiRunCand = createSampleCandidate({
      verificationStatus: "unverified",
      sourceUrls: [],
      providerIds: ["gemini-search"],
      observedRunIds: ["run_100_first", "run_200_second"], // 2 Distinct Runs
    });

    const evalRes = evaluateAutoPublishCandidate(multiRunCand, [], [], {
      maxValidationAgeHours: 24,
      tierBRequiredObservations: 2,
    });

    expect(evalRes.tier).toBe("B");
    expect(evalRes.eligible).toBe(true);
    expect(evalRes.passedGates.some((g) => g.includes("tier-b-multi-run-observation"))).toBe(true);
  });

  it("Test D: 2 duplicate provider IDs -> Count as one provider and do NOT qualify", () => {
    const duplicateProviderCand = createSampleCandidate({
      verificationStatus: "unverified",
      sourceUrls: [],
      providerIds: ["gemini-search", "gemini-search"], // Duplicate provider
      observedRunIds: ["run_100_first"],
    });

    const evalRes = evaluateAutoPublishCandidate(duplicateProviderCand, [], [], {
      maxValidationAgeHours: 24,
      tierBRequiredObservations: 2,
    });

    expect(evalRes.eligible).toBe(false);
  });

  it("Test E: Two unique provider IDs -> Tier B eligible", () => {
    const multiProviderCand = createSampleCandidate({
      verificationStatus: "unverified",
      sourceUrls: [],
      providerIds: ["gemini-search", "tavily-search"], // 2 Unique providers
      observedRunIds: ["run_100_first"],
    });

    const evalRes = evaluateAutoPublishCandidate(multiProviderCand, [], [], {
      maxValidationAgeHours: 24,
      tierBRequiredObservations: 2,
    });

    expect(evalRes.tier).toBe("B");
    expect(evalRes.eligible).toBe(true);
  });

  it("Test F: Revalidation unknown run #1 -> Persists consecutiveUnknownCount = 1 to disk", async () => {
    const publishedGroup = createSampleCandidate({ published: true });
    fs.writeFileSync(groupsPath, JSON.stringify([publishedGroup], null, 2), "utf-8");

    const mockValidators = {
      discordValidator: async () => ({
        url: publishedGroup.inviteUrl,
        status: "unknown" as const,
        message: "HTTP 429 Rate limited",
        checkedAt: new Date().toISOString(),
      }),
    };

    const res = await runRevalidatePublished(undefined, tempDir, mockValidators);
    expect(res.temporaryUnknownCount).toBe(1);
    expect(res.autoUnpublished).toBe(0);

    const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
    expect(savedGroups).toHaveLength(1);
    expect(savedGroups[0].consecutiveUnknownCount).toBe(1);
    expect(savedGroups[0].linkStatus).toBe("unknown");
    expect(savedGroups[0].lastKnownLinkStatus).toBe("active");
  });

  it("Test G: Revalidation unknown run #2 -> Persists consecutiveUnknownCount = 2 to disk", async () => {
    const publishedGroup = createSampleCandidate({
      published: true,
      consecutiveUnknownCount: 1,
      linkStatus: "unknown",
      lastKnownLinkStatus: "active",
    });
    fs.writeFileSync(groupsPath, JSON.stringify([publishedGroup], null, 2), "utf-8");

    const mockValidators = {
      discordValidator: async () => ({
        url: publishedGroup.inviteUrl,
        status: "unknown" as const,
        message: "HTTP 503 Service unavailable",
        checkedAt: new Date().toISOString(),
      }),
    };

    const res = await runRevalidatePublished(undefined, tempDir, mockValidators);
    expect(res.temporaryUnknownCount).toBe(1);
    expect(res.autoUnpublished).toBe(0);

    const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
    expect(savedGroups).toHaveLength(1);
    expect(savedGroups[0].consecutiveUnknownCount).toBe(2);
  });

  it("Test H: Revalidation unknown run #3 -> Auto-unpublishes and archives record", async () => {
    const publishedGroup = createSampleCandidate({
      published: true,
      consecutiveUnknownCount: 2,
      linkStatus: "unknown",
      lastKnownLinkStatus: "active",
    });
    fs.writeFileSync(groupsPath, JSON.stringify([publishedGroup], null, 2), "utf-8");

    const mockValidators = {
      discordValidator: async () => ({
        url: publishedGroup.inviteUrl,
        status: "unknown" as const,
        message: "HTTP 504 Gateway timeout",
        checkedAt: new Date().toISOString(),
      }),
    };

    const res = await runRevalidatePublished(undefined, tempDir, mockValidators);
    expect(res.autoUnpublished).toBe(1);
    expect(res.activeRetained).toBe(0);

    const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
    const savedArchived: ArchivedCommunity[] = JSON.parse(fs.readFileSync(archivedPath, "utf-8"));

    expect(savedGroups).toHaveLength(0);
    expect(savedArchived).toHaveLength(1);
    expect(savedArchived[0].unpublishReason).toContain("repeated-unknown-status");
  });

  it("Test I: Definitive dead link -> Auto-unpublishes immediately on first encounter", async () => {
    const publishedGroup = createSampleCandidate({ published: true });
    fs.writeFileSync(groupsPath, JSON.stringify([publishedGroup], null, 2), "utf-8");

    const mockValidators = {
      discordValidator: async () => ({
        url: publishedGroup.inviteUrl,
        status: "dead" as const,
        message: "404 Invite expired",
        checkedAt: new Date().toISOString(),
      }),
    };

    const res = await runRevalidatePublished(undefined, tempDir, mockValidators);
    expect(res.autoUnpublished).toBe(1);

    const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
    const savedArchived: ArchivedCommunity[] = JSON.parse(fs.readFileSync(archivedPath, "utf-8"));

    expect(savedGroups).toHaveLength(0);
    expect(savedArchived).toHaveLength(1);
    expect(savedArchived[0].lastKnownStatus).toBe("dead");
    expect(savedArchived[0].unpublishReason).toContain("dead-link");
  });

  it("Test J: Active revalidation -> Persists fresh lastCheckedAt and refreshed memberCount", async () => {
    const publishedGroup = createSampleCandidate({ published: true, memberCount: 1000 });
    fs.writeFileSync(groupsPath, JSON.stringify([publishedGroup], null, 2), "utf-8");

    const mockValidators = {
      discordValidator: async () => ({
        url: publishedGroup.inviteUrl,
        status: "active" as const,
        extractedMemberCount: 15500,
        extractedTitle: "Canada Tech Jobs & Hiring Hub",
        checkedAt: new Date().toISOString(),
      }),
    };

    const res = await runRevalidatePublished(undefined, tempDir, mockValidators);
    expect(res.activeRetained).toBe(1);

    const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
    expect(savedGroups).toHaveLength(1);
    expect(savedGroups[0].memberCount).toBe(15500);
    expect(savedGroups[0].lastValidationStatus).toBe("active");
    expect(savedGroups[0].lastSuccessfulValidationAt).toBeTruthy();
  });

  it("Test K: sourceCheckedAt controls 30-day source reverification", async () => {
    let sourceCheckTriggered = false;
    const staleSourceTime = new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString(); // 35 days ago

    const publishedGroup = createSampleCandidate({
      published: true,
      verificationStatus: "source-confirmed",
      sourceUrls: ["https://canadahire.ca"],
      sourceCheckedAt: staleSourceTime,
    });
    fs.writeFileSync(groupsPath, JSON.stringify([publishedGroup], null, 2), "utf-8");

    const mockValidators = {
      discordValidator: async () => ({
        url: publishedGroup.inviteUrl,
        status: "active" as const,
        checkedAt: new Date().toISOString(),
      }),
      sourceVerifier: async () => {
        sourceCheckTriggered = true;
        return { isConfirmed: true, evidenceSnippet: "Verified Canadian tech hiring" };
      },
    };

    await runRevalidatePublished(undefined, tempDir, mockValidators);
    expect(sourceCheckTriggered).toBe(true);

    const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
    expect(savedGroups[0].verificationStatus).toBe("source-confirmed");
    expect(new Date(savedGroups[0].sourceCheckedAt!).getTime()).toBeGreaterThan(new Date(staleSourceTime).getTime());
  });

  it("Test L: Archived candidate can be safely restored if all publication gates pass", async () => {
    const archivedRecord: ArchivedCommunity = {
      id: "sample-cand-ca",
      slug: "sample-cand-ca",
      title: "Canada Tech Jobs & Hiring Hub",
      platform: "discord",
      inviteUrl: "https://discord.gg/sample-ca-hub",
      unpublishedAt: now,
      unpublishReason: "dead-link",
      lastKnownStatus: "dead",
      guildId: "888888888888888888",
      countryCode: "CA",
      category: "tech-jobs",
    };
    fs.writeFileSync(archivedPath, JSON.stringify([archivedRecord], null, 2), "utf-8");

    const restoredCandidate = createSampleCandidate({
      verificationStatus: "source-confirmed",
      sourceUrls: ["https://canadahire.ca"],
      sourceCheckedAt: now,
      descriptionSource: "confirmed-source",
    });
    fs.writeFileSync(pendingPath, JSON.stringify([restoredCandidate], null, 2), "utf-8");

    const result = await runAutoPublish(
      {
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
      },
      tempDir
    );

    expect(result.restoredCount).toBe(1);
    expect(result.publishedCount).toBe(1);

    const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
    const savedArchived: ArchivedCommunity[] = JSON.parse(fs.readFileSync(archivedPath, "utf-8"));

    expect(savedGroups).toHaveLength(1);
    expect(savedGroups[0].id).toBe("sample-cand-ca");
    expect(savedArchived).toHaveLength(0); // Cleaned from archive!
  });

  it("Test M: Two duplicate pending candidates with same guildId cannot both publish in same batch", async () => {
    const cand1 = createSampleCandidate({
      id: "cand-1",
      slug: "cand-1",
      inviteUrl: "https://discord.gg/vanity-1",
      guildId: "777777777777777777",
      verificationStatus: "source-confirmed",
      sourceUrls: ["https://source1.ca"],
    });

    const cand2 = createSampleCandidate({
      id: "cand-2",
      slug: "cand-2",
      inviteUrl: "https://discord.gg/vanity-2",
      guildId: "777777777777777777", // Same guild ID
      verificationStatus: "source-confirmed",
      sourceUrls: ["https://source2.ca"],
    });

    fs.writeFileSync(pendingPath, JSON.stringify([cand1, cand2], null, 2), "utf-8");

    const result = await runAutoPublish(
      {
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
      },
      tempDir
    );

    expect(result.publishedCount).toBe(1); // Only 1 allowed in batch!
    const savedGroups: Community[] = JSON.parse(fs.readFileSync(groupsPath, "utf-8"));
    const savedPending: Community[] = JSON.parse(fs.readFileSync(pendingPath, "utf-8"));

    expect(savedGroups).toHaveLength(1);
    expect(savedPending).toHaveLength(1);
  });

  it("Test N: countryEvidence.sourceUrl by itself cannot establish country", () => {
    const candidateWithoutGeoText: Community = createSampleCandidate({
      title: "General Developer Network",
      description: "Chat with coders.",
      countryCode: "CA",
      countryEvidence: {
        sourceType: "official-source",
        text: "", // Empty geo text
        sourceUrl: "https://some-canadian-domain.ca/jobs",
        checkedAt: now,
      },
    });

    const val = validateCountryEvidence(candidateWithoutGeoText);
    expect(val.isValid).toBe(false);
  });

  it("Test O: Classifier tag 'canada' by itself cannot establish country without matching text", () => {
    const candidateWithOnlyTag: Community = createSampleCandidate({
      title: "General Developer Network",
      description: "Discuss tech careers globally.",
      tags: ["canada", "tech", "jobs"], // Tag exists
      countryCode: "CA",
      countryEvidence: null,
    });

    const val = validateCountryEvidence(candidateWithOnlyTag);
    expect(val.isValid).toBe(false);
  });
});
