import "../utilities/loadEnv";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type { Community, ArchivedCommunity } from "../../src/types/community";
import { autoPublishConfig } from "../../src/config/autoPublish";
import { isDuplicateListing } from "./deduplicate";
import { isJobRelevant, classifyJobScamRisk, hasStrongJobIntent } from "../safety/jobRiskClassifier";
import { validateCommunitiesData } from "./validateSchema";
import { atomicWriteJson } from "./mergeListings";
import { getCurrentIsoTimestamp } from "../../src/lib/dates";
import { normalizeInviteUrl } from "../../src/lib/urls";

export interface AutoPublishEvaluation {
  candidate: Community;
  tier: "A" | "B" | "C";
  eligible: boolean;
  passedGates: string[];
  blockedReasons: string[];
}

export interface AutoPublishResult {
  evaluatedCount: number;
  tierACount: number;
  tierBCount: number;
  tierCCount: number;
  eligibleCount: number;
  publishedCount: number;
  rejectedProbationCount: number;
  circuitBreakerTriggered: boolean;
  circuitBreakerReason?: string;
  evaluations: AutoPublishEvaluation[];
}

const TIER_1_COUNTRIES = new Set(["US", "GB", "CA", "AU"]);

/**
 * Deterministically evaluates whether a staging/probation candidate passes
 * all strict mandatory auto-publish gates and classifies its publication tier.
 */
export function evaluateAutoPublishCandidate(
  candidate: Community,
  allKnownPublished: Community[],
  archivedCommunities: ArchivedCommunity[] = [],
  options = { maxValidationAgeHours: autoPublishConfig.maxValidationAgeHours, tierBRequiredObservations: autoPublishConfig.tierBRequiredObservations }
): AutoPublishEvaluation {
  const passedGates: string[] = [];
  const blockedReasons: string[] = [];

  // 1. Mandatory Gate: Vertical
  if (candidate.vertical === "jobs") {
    passedGates.push("vertical-jobs");
  } else {
    blockedReasons.push("vertical-not-jobs");
  }

  // 2. Mandatory Gate: Platform
  if (["discord", "telegram", "whatsapp"].includes(candidate.platform)) {
    passedGates.push("valid-platform");
  } else {
    blockedReasons.push("unsupported-platform");
  }

  // 3. Mandatory Gate: Link Status
  if (candidate.linkStatus === "active") {
    passedGates.push("link-active");
  } else {
    blockedReasons.push(`link-status-${candidate.linkStatus}`);
  }

  // 4. Mandatory Gate: Validation Freshness
  const now = Date.now();
  if (candidate.lastCheckedAt) {
    const checkedTime = new Date(candidate.lastCheckedAt).getTime();
    const ageHours = (now - checkedTime) / (1000 * 60 * 60);
    if (!isNaN(checkedTime) && ageHours <= options.maxValidationAgeHours) {
      passedGates.push("validation-fresh");
    } else {
      blockedReasons.push(`validation-stale-${Math.round(ageHours)}h`);
    }
  } else {
    blockedReasons.push("missing-lastCheckedAt");
  }

  // 5. Mandatory Gate: Strict Tier-1 Country Code
  if (candidate.countryCode && TIER_1_COUNTRIES.has(candidate.countryCode)) {
    passedGates.push("tier1-country-code");
  } else {
    blockedReasons.push(candidate.countryCode ? `non-tier1-country-${candidate.countryCode}` : "missing-country-code");
  }

  // 6. Mandatory Gate: Target-Market Country Evidence
  const textToCheck = `${candidate.title} ${candidate.description || ""} ${candidate.tags.join(" ")}`.toLowerCase();
  const hasPlatformCountryMention =
    candidate.countryCode === "US" ? /\b(usa?|united\s+states|america|nyc|california|texas|san\s+francisco|chicago|seattle)\b/i.test(textToCheck) :
    candidate.countryCode === "GB" ? /\b(uk|united\s+kingdom|britain|british|london|manchester|birmingham|leeds|scotland)\b/i.test(textToCheck) :
    candidate.countryCode === "CA" ? /\b(canada|canadian|toronto|vancouver|montreal|ottawa|ontario|alberta|bc)\b/i.test(textToCheck) :
    candidate.countryCode === "AU" ? /\b(australia|australian|sydney|melbourne|brisbane|perth|adelaide|nsw|victoria)\b/i.test(textToCheck) : false;

  const hasExplicitEvidence = Boolean(
    candidate.countryEvidence?.text ||
    candidate.countryEvidence?.sourceUrl ||
    hasPlatformCountryMention ||
    (candidate.verificationStatus === "source-confirmed" && candidate.sourceUrls.length > 0)
  );

  if (hasExplicitEvidence) {
    passedGates.push("country-evidence-present");
  } else {
    blockedReasons.push("unconfirmed-target-country-evidence");
  }

  // 7. Mandatory Gate: Strong Employment Intent
  const fullText = `${candidate.title} ${candidate.description || ""}`.trim();
  const intentCheck = hasStrongJobIntent(fullText);
  const relevanceCheck = isJobRelevant(fullText);
  if (intentCheck.hasIntent && relevanceCheck.isJobRelated) {
    passedGates.push("strong-job-intent");
  } else {
    blockedReasons.push(`insufficient-job-intent: ${intentCheck.reason || relevanceCheck.reason || "missing employment terms"}`);
  }

  // 8. Mandatory Gate: Safety & Scam Prevention
  const scamCheck = classifyJobScamRisk(fullText);
  if (!scamCheck.isSevereScam && (!candidate.safetyFlags || candidate.safetyFlags.length === 0)) {
    passedGates.push("safety-clean");
  } else {
    blockedReasons.push(`scam-risk-flags: ${scamCheck.safetyFlags.concat(candidate.safetyFlags || []).join(", ")}`);
  }

  // 9. Mandatory Gate: Inactive / Repurposed Filter
  if (/\b(inactive|shut\s+down|closed\s+down|no\s+longer\s+active|deleted\s+server|server\s+closed)\b/i.test(candidate.title)) {
    blockedReasons.push("server-inactive-or-closed");
  } else {
    passedGates.push("active-server-name");
  }

  // 10. Mandatory Gate: Deduplication against published and archived records
  const allHistoricalKnown = [...allKnownPublished, ...archivedCommunities.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    platform: a.platform,
    vertical: "jobs" as const,
    category: a.category || "tech-jobs",
    tags: [],
    inviteUrl: a.inviteUrl,
    countryCode: a.countryCode || null,
    city: null,
    jobTypes: [],
    industries: [],
    workArrangement: "unknown" as const,
    experienceLevels: [],
    visaSponsorship: "unknown" as const,
    verificationStatus: "unverified" as const,
    linkStatus: a.lastKnownStatus,
    sourceUrls: [],
    discoveryMethod: "manual" as const,
    discoveredAt: a.unpublishedAt,
    guildId: a.guildId || null,
    published: false,
  }))];

  const dupCheck = isDuplicateListing(
    {
      inviteUrl: candidate.inviteUrl,
      platform: candidate.platform,
      guildId: candidate.guildId || undefined,
      title: candidate.title,
    },
    allHistoricalKnown
  );

  if (!dupCheck.isDuplicate) {
    passedGates.push("no-duplicates");
  } else {
    blockedReasons.push(`duplicate: ${dupCheck.reason}`);
  }

  // 11. Mandatory Gate: Metadata Integrity (No AI hallucinated fluff)
  if (candidate.description && candidate.description.length > 500) {
    blockedReasons.push("description-exceeds-max-length");
  } else {
    passedGates.push("description-integrity");
  }

  // Determine Publication Tier
  const isMandatoryPass = blockedReasons.length === 0;
  let tier: "A" | "B" | "C" = "C";
  let eligible = false;

  if (isMandatoryPass) {
    if (candidate.verificationStatus === "source-confirmed" && candidate.sourceUrls.length > 0) {
      // TIER A: Source-confirmed with proven outbound link
      tier = "A";
      eligible = true;
      passedGates.push("tier-a-source-confirmed");
    } else {
      // TIER B Evaluation: Platform-confirmed with multi-provider or multi-run observation
      const providerCount = candidate.providerIds ? candidate.providerIds.length : 1;
      const observationCount = candidate.timesSeen || 1;

      if (providerCount >= 2) {
        tier = "B";
        eligible = true;
        passedGates.push(`tier-b-multi-provider (${providerCount} providers)`);
      } else if (observationCount >= options.tierBRequiredObservations) {
        tier = "B";
        eligible = true;
        passedGates.push(`tier-b-multi-run-observation (${observationCount} runs)`);
      } else {
        tier = "C";
        eligible = false;
        blockedReasons.push(`tier-b-pending-observation (seen: ${observationCount}/${options.tierBRequiredObservations}, providers: ${providerCount})`);
      }
    }
  } else {
    tier = "C";
    eligible = false;
  }

  return {
    candidate,
    tier,
    eligible,
    passedGates,
    blockedReasons,
  };
}

/**
 * Runs the fully automated publication engine over src/data/pending-groups.json.
 */
export async function runAutoPublish(options = autoPublishConfig): Promise<AutoPublishResult> {
  console.log("=========================================");
  console.log(`?? AUTOMATED PUBLICATION ENGINE ${options.dryRun ? "[DRY RUN]" : ""}`);
  console.log("=========================================");

  const dataDir = path.resolve(process.cwd(), "src/data");
  const groupsPath = path.join(dataDir, "groups.json");
  const pendingPath = path.join(dataDir, "pending-groups.json");
  const rejectedPath = path.join(dataDir, "rejected-candidates.json");
  const archivedPath = path.join(dataDir, "archived-groups.json");

  const published: Community[] = fs.existsSync(groupsPath)
    ? JSON.parse(fs.readFileSync(groupsPath, "utf-8"))
    : [];
  const pending: Community[] = fs.existsSync(pendingPath)
    ? JSON.parse(fs.readFileSync(pendingPath, "utf-8"))
    : [];
  const rejected: any[] = fs.existsSync(rejectedPath)
    ? JSON.parse(fs.readFileSync(rejectedPath, "utf-8"))
    : [];
  const archived: ArchivedCommunity[] = fs.existsSync(archivedPath)
    ? JSON.parse(fs.readFileSync(archivedPath, "utf-8"))
    : [];

  console.log(`[auto-publish] Current database: ${published.length} published, ${pending.length} probation, ${archived.length} archived.`);

  if (!options.enabled && !options.dryRun) {
    console.log("[auto-publish] Auto-publishing is currently disabled via config. Skipping.");
    return {
      evaluatedCount: 0,
      tierACount: 0,
      tierBCount: 0,
      tierCCount: 0,
      eligibleCount: 0,
      publishedCount: 0,
      rejectedProbationCount: 0,
      circuitBreakerTriggered: false,
      evaluations: [],
    };
  }

  const nowIso = getCurrentIsoTimestamp();
  const evaluations: AutoPublishEvaluation[] = [];
  const eligibleToPublish: Community[] = [];
  const remainingPending: Community[] = [];
  let rejectedProbationCount = 0;

  for (const cand of pending) {
    const evaluation = evaluateAutoPublishCandidate(cand, published, archived, {
      maxValidationAgeHours: options.maxValidationAgeHours,
      tierBRequiredObservations: options.tierBRequiredObservations,
    });
    evaluations.push(evaluation);

    // Update probation metadata
    cand.publicationTier = evaluation.tier;
    cand.autoPublishBlockedReasons = evaluation.blockedReasons;

    if (evaluation.eligible) {
      eligibleToPublish.push(cand);
    } else {
      // Check probation age limit (e.g. 7 days max)
      const firstSeen = cand.firstSeenAt ? new Date(cand.firstSeenAt).getTime() : new Date(cand.discoveredAt).getTime();
      const ageDays = (Date.now() - firstSeen) / (1000 * 60 * 60 * 24);

      if (ageDays > options.probationMaxDays) {
        console.log(`  ?? Probation Expired (> ${options.probationMaxDays}d): "${cand.title}" -> Auto-rejecting.`);
        rejected.push({
          url: cand.inviteUrl,
          platform: cand.platform,
          title: cand.title,
          reason: "insufficient-publication-confidence",
          date: nowIso,
          lastSeenAt: nowIso,
          timesSeen: cand.timesSeen || 1,
        });
        rejectedProbationCount++;
      } else {
        remainingPending.push(cand);
      }
    }
  }

  const tierACount = evaluations.filter((e) => e.tier === "A").length;
  const tierBCount = evaluations.filter((e) => e.tier === "B").length;
  const tierCCount = evaluations.filter((e) => e.tier === "C").length;
  const eligibleCount = eligibleToPublish.length;

  console.log(`\n[auto-publish] Evaluation Summary:`);
  console.log(`  Tier A (High Confidence) : ${tierACount}`);
  console.log(`  Tier B (Platform Multi)  : ${tierBCount}`);
  console.log(`  Tier C (Probation/Hold)  : ${tierCCount}`);
  console.log(`  Total Eligible           : ${eligibleCount}`);

  // Anomaly Circuit Breaker check
  let circuitBreakerTriggered = false;
  let circuitBreakerReason: string | undefined;

  if (pending.length > 10 && eligibleCount / pending.length > 0.8) {
    circuitBreakerTriggered = true;
    circuitBreakerReason = "Anomaly: over 80% of candidates unexpectedly qualified for publication in a single batch.";
  }

  if (circuitBreakerTriggered) {
    console.warn(`\n??  CIRCUIT BREAKER TRIGGERED: ${circuitBreakerReason}`);
    console.warn("  -> Publication suspended for this run to protect database integrity.");
    return {
      evaluatedCount: pending.length,
      tierACount,
      tierBCount,
      tierCCount,
      eligibleCount,
      publishedCount: 0,
      rejectedProbationCount,
      circuitBreakerTriggered: true,
      circuitBreakerReason,
      evaluations,
    };
  }

  // Apply maximum publication cap per run (safety circuit breaker)
  const toPublishNow = eligibleToPublish.slice(0, options.maxPerRun);
  const deferToNextRun = eligibleToPublish.slice(options.maxPerRun);
  remainingPending.push(...deferToNextRun);

  console.log(`\n[auto-publish] Publishing ${toPublishNow.length} community(ies) (Cap: ${options.maxPerRun}/run)...`);

  for (const item of toPublishNow) {
    item.published = true;
    item.updatedAt = nowIso;
    published.push(item);
    console.log(`  ?? Auto-Published [Tier ${item.publicationTier}]: "${item.title}" (${item.countryCode} - ${item.category})`);
  }

  if (options.dryRun) {
    console.log("\n?? DRY RUN: No modifications were saved to groups.json or pending-groups.json.");
    return {
      evaluatedCount: pending.length,
      tierACount,
      tierBCount,
      tierCCount,
      eligibleCount,
      publishedCount: toPublishNow.length,
      rejectedProbationCount,
      circuitBreakerTriggered: false,
      evaluations,
    };
  }

  if (toPublishNow.length > 0 || rejectedProbationCount > 0) {
    // Validate datasets before saving
    published.sort((a, b) => a.title.localeCompare(b.title));
    const valPub = validateCommunitiesData(published);
    const valPen = validateCommunitiesData(remainingPending);

    if (!valPub.valid || !valPen.valid) {
      console.error("? Schema validation failed during auto-publish:", [
        ...valPub.errors,
        ...valPen.errors,
      ]);
      throw new Error("Schema validation failure during auto-publish");
    }

    atomicWriteJson(groupsPath, valPub.communities);
    atomicWriteJson(pendingPath, valPen.communities);
    atomicWriteJson(rejectedPath, rejected);

    console.log(`\n? Database updated cleanly: ${published.length} published, ${remainingPending.length} in probation.`);
  }

  return {
    evaluatedCount: pending.length,
    tierACount,
    tierBCount,
    tierCCount,
    eligibleCount,
    publishedCount: toPublishNow.length,
    rejectedProbationCount,
    circuitBreakerTriggered: false,
    evaluations,
  };
}

if (process.argv[1] && process.argv[1].endsWith("autoPublish.ts")) {
  runAutoPublish().catch((err) => {
    console.error("? Auto-publish encountered a fatal error:", err);
    process.exit(1);
  });
}
