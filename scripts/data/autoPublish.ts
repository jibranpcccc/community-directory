import "../utilities/loadEnv";
import * as fs from "fs";
import * as path from "path";
import type { Community, ArchivedCommunity, CountryEvidence, DescriptionSource } from "../../src/types/community";
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
  isRestoration: boolean;
  restoredArchivedRecord?: ArchivedCommunity;
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
  restoredCount: number;
  rejectedProbationCount: number;
  circuitBreakerTriggered: boolean;
  circuitBreakerReason?: string;
  evaluations: AutoPublishEvaluation[];
}

const TIER_1_COUNTRIES = new Set(["US", "GB", "CA", "AU"]);

/**
 * Strict Geographic regex patterns.
 * IMPORTANT: Explicit US geographic forms only. "usa?" was REMOVED to avoid matching pronoun "us" in "Join us".
 */
export const COUNTRY_GEO_PATTERNS: Record<string, RegExp> = {
  US: /\b(united\s+states(?:\s+of\s+america)?|u\.s\.a\.|usa|u\.s\.|american|california|texas|new\s+york|nyc|washington|florida|illinois|chicago|seattle|san\s+francisco|los\s+angeles|boston|austin|atlanta|colorado|ohio|virginia|michigan|georgia|north\s+carolina|pennsylvania|arizona|san\s+diego|dallas|houston|denver|miami)\b/i,
  GB: /\b(united\s+kingdom|u\.k\.|uk|great\s+britain|britain|british|england|scotland|wales|northern\s+ireland|london|manchester|birmingham|leeds|glasgow|edinburgh|bristol)\b/i,
  CA: /\b(canada|canadian|ontario|quebec|british\s+columbia|alberta|toronto|vancouver|montreal|ottawa|calgary|edmonton|waterloo)\b/i,
  AU: /\b(australia|australian|nsw|victoria|queensland|sydney|melbourne|brisbane|perth|adelaide|canberra)\b/i,
};

const VALID_DESCRIPTION_SOURCES = new Set<string>([
  "platform",
  "confirmed-source",
  "platform-title",
  "platform-description",
  "independent-source",
]);

/**
 * Validates whether the candidate possesses genuine factual geographic evidence
 * originating from platform title/description or independently fetched source text.
 * Requires trusted sourceType and matching text. AI tags or bare URLs alone do not count.
 */
export function validateCountryEvidence(candidate: Community): {
  isValid: boolean;
  evidence: CountryEvidence | null;
  reason?: string;
} {
  if (!candidate.countryCode || !TIER_1_COUNTRIES.has(candidate.countryCode)) {
    return { isValid: false, evidence: null, reason: "Non-Tier-1 or missing countryCode" };
  }

  const pattern = COUNTRY_GEO_PATTERNS[candidate.countryCode];
  if (!pattern) {
    return { isValid: false, evidence: null, reason: `No pattern defined for ${candidate.countryCode}` };
  }

  const now = getCurrentIsoTimestamp();

  // 1. Check explicit countryEvidence
  if (candidate.countryEvidence && candidate.countryEvidence.text) {
    const trustedTypes = new Set(["platform-title", "platform-description", "independent-source", "official-source"]);
    if (trustedTypes.has(candidate.countryEvidence.sourceType)) {
      if (pattern.test(candidate.countryEvidence.text)) {
        // If independent source, require explicit sourceUrl and checkedAt (fail-closed)
        if (
          candidate.countryEvidence.sourceType === "independent-source" ||
          candidate.countryEvidence.sourceType === "official-source"
        ) {
          if (
            candidate.countryEvidence.sourceUrl &&
            candidate.countryEvidence.sourceUrl.startsWith("http") &&
            candidate.countryEvidence.checkedAt
          ) {
            return {
              isValid: true,
              evidence: {
                sourceType: candidate.countryEvidence.sourceType,
                text: candidate.countryEvidence.text.trim(),
                sourceUrl: candidate.countryEvidence.sourceUrl,
                checkedAt: candidate.countryEvidence.checkedAt,
              },
            };
          }
          // Lacks full independent verification provenance -> fail closed
          return {
            isValid: false,
            evidence: null,
            reason: "Independent source country evidence missing sourceUrl or checkedAt provenance",
          };
        } else {
          return {
            isValid: true,
            evidence: {
              sourceType: candidate.countryEvidence.sourceType,
              text: candidate.countryEvidence.text.trim(),
              checkedAt: candidate.countryEvidence.checkedAt || now,
            },
          };
        }
      }
    }
  }

  // 2. Check platform title
  if (candidate.title && pattern.test(candidate.title)) {
    return {
      isValid: true,
      evidence: {
        sourceType: "platform-title",
        text: candidate.title.trim(),
        checkedAt: now,
      },
    };
  }

  // 3. Check platform description
  if (candidate.description && pattern.test(candidate.description)) {
    return {
      isValid: true,
      evidence: {
        sourceType: "platform-description",
        text: candidate.description.trim().slice(0, 300),
        checkedAt: now,
      },
    };
  }

  return {
    isValid: false,
    evidence: null,
    reason: `No factual geographic evidence matching ${candidate.countryCode} found in platform title, description, or verified source text. (Pronouns like "us", tags, or bare sourceUrls alone are insufficient)`,
  };
}

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
  const nowMs = Date.now();
  if (candidate.lastCheckedAt) {
    const checkedTime = new Date(candidate.lastCheckedAt).getTime();
    const ageHours = (nowMs - checkedTime) / (1000 * 60 * 60);
    if (!isNaN(checkedTime) && ageHours <= options.maxValidationAgeHours) {
      passedGates.push("validation-fresh");
    } else {
      blockedReasons.push(`validation-stale-${Math.round(ageHours)}h`);
    }
  } else {
    blockedReasons.push("missing-lastCheckedAt");
  }

  // 5. Mandatory Gate: Strict Tier-1 Country Code & Factual Geographic Evidence
  if (candidate.countryCode && TIER_1_COUNTRIES.has(candidate.countryCode)) {
    passedGates.push("tier1-country-code");
  } else {
    blockedReasons.push(candidate.countryCode ? `non-tier1-country-${candidate.countryCode}` : "missing-country-code");
  }

  const countryValidation = validateCountryEvidence(candidate);
  if (countryValidation.isValid && countryValidation.evidence) {
    passedGates.push("country-evidence-verified");
    candidate.countryEvidence = countryValidation.evidence;
  } else {
    blockedReasons.push(`unconfirmed-country-evidence: ${countryValidation.reason}`);
  }

  // 6. Mandatory Gate: City Provenance (Fail-closed)
  if (candidate.city !== null && candidate.city !== undefined && candidate.city.trim() !== "") {
    if (candidate.cityEvidence && candidate.cityEvidence.text) {
      const cityRegex = new RegExp(`\\b${candidate.city.trim()}\\b`, "i");
      if (cityRegex.test(candidate.cityEvidence.text)) {
        passedGates.push("city-evidence-verified");
      } else {
        candidate.city = null;
        candidate.cityEvidence = null;
      }
    } else {
      // Platform title/description contains city?
      const fullText = `${candidate.title} ${candidate.description || ""}`;
      const cityRegex = new RegExp(`\\b${candidate.city.trim()}\\b`, "i");
      if (cityRegex.test(fullText)) {
        candidate.cityEvidence = {
          sourceType: candidate.title.match(cityRegex) ? "platform-title" : "platform-description",
          text: candidate.city.trim(),
          checkedAt: getCurrentIsoTimestamp(),
        };
        passedGates.push("city-evidence-verified");
      } else {
        candidate.city = null;
        candidate.cityEvidence = null;
      }
    }
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

  // 10. Mandatory Gate: Member Count Provenance
  if (candidate.memberCount !== null && candidate.memberCount !== undefined && !candidate.memberCountSource) {
    blockedReasons.push("member-count-missing-source");
  } else {
    passedGates.push("member-count-provenance");
  }

  // 11. Mandatory Gate: Description Provenance (Fail-Closed: Never auto-assign)
  if (candidate.description !== null && candidate.description !== undefined && candidate.description.trim() !== "") {
    if (!candidate.descriptionSource || !VALID_DESCRIPTION_SOURCES.has(candidate.descriptionSource)) {
      blockedReasons.push("missing-description-provenance");
    } else {
      passedGates.push("description-provenance-verified");
    }
  } else {
    passedGates.push("description-null-valid");
  }

  // 12. Check against Published and Archived Lists
  const publishedDupCheck = isDuplicateListing(
    {
      inviteUrl: candidate.inviteUrl,
      platform: candidate.platform,
      guildId: candidate.guildId || undefined,
      title: candidate.title,
    },
    allKnownPublished
  );

  if (publishedDupCheck.isDuplicate) {
    blockedReasons.push(`duplicate-published: ${publishedDupCheck.reason}`);
  } else {
    passedGates.push("no-published-duplicates");
  }

  // Check Archived Restoration Candidate
  let isRestoration = false;
  let restoredArchivedRecord: ArchivedCommunity | undefined;

  const normalizedCandUrl = normalizeInviteUrl(candidate.inviteUrl);
  const matchingArchived = archivedCommunities.find((a) => {
    if (normalizeInviteUrl(a.inviteUrl) === normalizedCandUrl) return true;
    if (candidate.platform === "discord" && candidate.guildId && a.guildId && candidate.guildId === a.guildId) return true;
    return false;
  });

  if (matchingArchived) {
    isRestoration = true;
    restoredArchivedRecord = matchingArchived;
    passedGates.push("archived-restoration-candidate");
  }

  // Determine Publication Tier
  const isMandatoryPass = blockedReasons.length === 0;
  let tier: "A" | "B" | "C" = "C";
  let eligible = false;

  if (isMandatoryPass) {
    // TIER A Evaluation: Real Persisted Source Verification Record
    const hasSourceVerification =
      candidate.verificationStatus === "source-confirmed" &&
      candidate.sourceUrls &&
      candidate.sourceUrls.length > 0 &&
      candidate.sourceVerification &&
      candidate.sourceVerification.status === "confirmed" &&
      candidate.sourceUrls.includes(candidate.sourceVerification.sourceUrl);

    let isTierAValid = false;
    if (hasSourceVerification && candidate.sourceVerification) {
      const sv = candidate.sourceVerification;
      const normSourceInvite = normalizeInviteUrl(sv.inviteUrl);
      const normCandInvite = normalizeInviteUrl(candidate.inviteUrl);
      const isUrlMatch = normSourceInvite === normCandInvite;
      const isGuildMatch = Boolean(
        candidate.platform === "discord" &&
        candidate.guildId &&
        sv.matchedGuildId &&
        sv.matchedGuildId === candidate.guildId
      );

      if (isUrlMatch || isGuildMatch) {
        const svAgeDays = (nowMs - new Date(sv.checkedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (svAgeDays <= 35) {
          isTierAValid = true;
        }
      }
    }

    if (isTierAValid) {
      tier = "A";
      eligible = true;
      passedGates.push("tier-a-source-confirmed");
    } else {
      // TIER B Evaluation: Platform-confirmed with multi-provider OR multi-run observation
      const uniqueProviders = new Set(candidate.providerIds || []).size;
      const uniqueRuns = new Set(candidate.observedRunIds || []).size;

      if (uniqueProviders >= 2) {
        tier = "B";
        eligible = true;
        passedGates.push(`tier-b-multi-provider (${uniqueProviders} unique providers)`);
      } else if (uniqueRuns >= options.tierBRequiredObservations) {
        tier = "B";
        eligible = true;
        passedGates.push(`tier-b-multi-run-observation (${uniqueRuns} distinct runs)`);
      } else {
        tier = "C";
        eligible = false;
        blockedReasons.push(`tier-b-pending-observation (distinct runs: ${uniqueRuns}/${options.tierBRequiredObservations}, unique providers: ${uniqueProviders})`);
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
    isRestoration,
    restoredArchivedRecord,
    passedGates,
    blockedReasons,
  };
}

/**
 * Extracts platform canonical identifier for batch deduplication.
 */
function extractPlatformBatchIdentity(community: Community): {
  type: string;
  key: string;
} {
  const normUrl = normalizeInviteUrl(community.inviteUrl);
  if (community.platform === "discord" && community.guildId) {
    return { type: "discord-guild", key: community.guildId };
  }
  if (community.platform === "telegram") {
    const handleMatch = normUrl.match(/t\.me\/([a-zA-Z0-9_+]+)/i);
    if (handleMatch) {
      return { type: "telegram-handle", key: handleMatch[1].toLowerCase() };
    }
  }
  if (community.platform === "whatsapp") {
    const codeMatch = normUrl.match(/chat\.whatsapp\.com\/([a-zA-Z0-9_-]+)/i);
    if (codeMatch) {
      return { type: "whatsapp-code", key: codeMatch[1].toLowerCase() };
    }
  }
  return { type: "url", key: normUrl };
}

/**
 * Runs the fully automated publication engine over src/data/pending-groups.json.
 * Enforces Fail-Closed Global Circuit Breaker on critical subsystem error.
 */
export async function runAutoPublish(
  options = autoPublishConfig,
  customDataDir?: string
): Promise<AutoPublishResult> {
  console.log("=========================================");
  console.log(`?? AUTOMATED PUBLICATION ENGINE ${options.dryRun ? "[DRY RUN]" : ""}`);
  console.log("=========================================");

  const dataDir = customDataDir || path.resolve(process.cwd(), "src/data");
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
  let archived: ArchivedCommunity[] = fs.existsSync(archivedPath)
    ? JSON.parse(fs.readFileSync(archivedPath, "utf-8"))
    : [];

  console.log(`[auto-publish] Database: ${published.length} published, ${pending.length} probation, ${archived.length} archived.`);

  if (!options.enabled && !options.dryRun) {
    console.log("[auto-publish] Auto-publishing is currently disabled via config. Skipping.");
    return {
      evaluatedCount: 0,
      tierACount: 0,
      tierBCount: 0,
      tierCCount: 0,
      eligibleCount: 0,
      publishedCount: 0,
      restoredCount: 0,
      rejectedProbationCount: 0,
      circuitBreakerTriggered: false,
      evaluations: [],
    };
  }

  const nowIso = getCurrentIsoTimestamp();
  const evaluations: AutoPublishEvaluation[] = [];
  const eligibleCandidates: Community[] = [];
  const remainingPending: Community[] = [];
  const restoredRecords: ArchivedCommunity[] = [];
  let rejectedProbationCount = 0;

  // Batch Deduplication across all platforms
  const batchSeenIdentities = new Set<string>();
  published.forEach((p) => {
    const ident = extractPlatformBatchIdentity(p);
    batchSeenIdentities.add(`${ident.type}:${ident.key}`);
  });

  let criticalSubsystemFailure = false;
  let criticalSubsystemReason: string | undefined;

  for (const cand of pending) {
    let evalResult: AutoPublishEvaluation;
    try {
      evalResult = evaluateAutoPublishCandidate(cand, published, archived, {
        maxValidationAgeHours: options.maxValidationAgeHours,
        tierBRequiredObservations: options.tierBRequiredObservations,
      });
    } catch (err: any) {
      console.error(`?? Critical subsystem error during evaluation on "${cand.title}":`, err.message);
      criticalSubsystemFailure = true;
      criticalSubsystemReason = `Subsystem failure on candidate "${cand.title}": ${err.message}`;
      evalResult = {
        candidate: cand,
        tier: "C",
        eligible: false,
        isRestoration: false,
        passedGates: [],
        blockedReasons: [`critical-subsystem-error: ${err.message}`],
      };
    }
    evaluations.push(evalResult);

    cand.publicationTier = evalResult.tier;
    cand.autoPublishBlockedReasons = evalResult.blockedReasons;

    if (evalResult.eligible && !criticalSubsystemFailure) {
      const ident = extractPlatformBatchIdentity(cand);
      const identKey = `${ident.type}:${ident.key}`;

      // Prevent duplicate in same pending batch (Discord guild, Telegram handle, WhatsApp code, URL)
      if (batchSeenIdentities.has(identKey)) {
        cand.autoPublishBlockedReasons.push(`duplicate-in-same-pending-batch-${ident.type}`);
        remainingPending.push(cand);
        continue;
      }

      batchSeenIdentities.add(identKey);

      if (evalResult.isRestoration && evalResult.restoredArchivedRecord) {
        restoredRecords.push(evalResult.restoredArchivedRecord);
        cand.id = evalResult.restoredArchivedRecord.id;
        cand.slug = evalResult.restoredArchivedRecord.slug;
      }

      eligibleCandidates.push(cand);
    } else {
      const firstSeen = cand.firstSeenAt ? new Date(cand.firstSeenAt).getTime() : new Date(cand.discoveredAt).getTime();
      const ageDays = (Date.now() - firstSeen) / (1000 * 60 * 60 * 24);

      if (ageDays > options.probationMaxDays) {
        console.log(`  ? Probation Expired (> ${options.probationMaxDays}d): "${cand.title}" -> Auto-rejecting.`);
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
  const eligibleCount = eligibleCandidates.length;

  console.log(`\n[auto-publish] Evaluation Summary:`);
  console.log(`  Tier A (High Confidence) : ${tierACount}`);
  console.log(`  Tier B (Platform Multi)  : ${tierBCount}`);
  console.log(`  Tier C (Probation/Hold)  : ${tierCCount}`);
  console.log(`  Total Eligible           : ${eligibleCount}`);

  // GLOBAL CIRCUIT BREAKER FAIL-CLOSED
  let circuitBreakerTriggered = false;
  let circuitBreakerReason: string | undefined;

  if (criticalSubsystemFailure) {
    circuitBreakerTriggered = true;
    circuitBreakerReason = `Critical subsystem failure: ${criticalSubsystemReason}`;
  } else if (pending.length >= 5 && eligibleCount / pending.length > 0.5) {
    circuitBreakerTriggered = true;
    circuitBreakerReason = `High eligible ratio anomaly: ${eligibleCount}/${pending.length} (>50%) qualified in single batch.`;
  } else {
    const querySourceCounts: Record<string, number> = {};
    const hostnameCounts: Record<string, number> = {};
    for (const c of eligibleCandidates) {
      if (c.querySource) querySourceCounts[c.querySource] = (querySourceCounts[c.querySource] || 0) + 1;
      if (c.sourceHostname) hostnameCounts[c.sourceHostname] = (hostnameCounts[c.sourceHostname] || 0) + 1;
    }

    for (const [qs, count] of Object.entries(querySourceCounts)) {
      if (count >= 5) {
        circuitBreakerTriggered = true;
        circuitBreakerReason = `Query clustering anomaly: ${count} candidates from same query "${qs}".`;
      }
    }

    for (const [hn, count] of Object.entries(hostnameCounts)) {
      if (count >= 5) {
        circuitBreakerTriggered = true;
        circuitBreakerReason = `Hostname clustering anomaly: ${count} candidates from same hostname "${hn}".`;
      }
    }
  }

  if (circuitBreakerTriggered) {
    console.warn(`\n??  GLOBAL CIRCUIT BREAKER TRIGGERED: ${circuitBreakerReason}`);
    console.warn("  -> Publication HALTED (0 published) to protect database integrity.");
    return {
      evaluatedCount: pending.length,
      tierACount,
      tierBCount,
      tierCCount,
      eligibleCount,
      publishedCount: 0,
      restoredCount: 0,
      rejectedProbationCount,
      circuitBreakerTriggered: true,
      circuitBreakerReason,
      evaluations,
    };
  }

  // Apply maximum publication cap per run
  const toPublishNow = eligibleCandidates.slice(0, options.maxPerRun);
  const deferToNextRun = eligibleCandidates.slice(options.maxPerRun);
  remainingPending.push(...deferToNextRun);

  console.log(`\n[auto-publish] Publishing ${toPublishNow.length} community(ies) (Cap: ${options.maxPerRun}/run)...`);

  for (const item of toPublishNow) {
    item.published = true;
    item.updatedAt = nowIso;
    item.lastKnownLinkStatus = "active";
    item.lastSuccessfulValidationAt = nowIso;
    published.push(item);
    console.log(`  ?? Auto-Published [Tier ${item.publicationTier}]: "${item.title}" (${item.countryCode} - ${item.category})`);
  }

  if (restoredRecords.length > 0) {
    const restoredIds = new Set(restoredRecords.map((r) => r.id));
    archived = archived.filter((a) => !restoredIds.has(a.id));
    console.log(`  ?? Restored ${restoredRecords.length} archived record(s) back to active directory.`);
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
      restoredCount: restoredRecords.length,
      rejectedProbationCount,
      circuitBreakerTriggered: false,
      evaluations,
    };
  }

  if (toPublishNow.length > 0 || rejectedProbationCount > 0 || restoredRecords.length > 0) {
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
    atomicWriteJson(archivedPath, archived);

    console.log(`\n? Database updated: ${published.length} published, ${remainingPending.length} in probation, ${archived.length} archived.`);
  }

  return {
    evaluatedCount: pending.length,
    tierACount,
    tierBCount,
    tierCCount,
    eligibleCount,
    publishedCount: toPublishNow.length,
    restoredCount: restoredRecords.length,
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
