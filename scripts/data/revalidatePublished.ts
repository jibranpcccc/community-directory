import "../utilities/loadEnv";
import * as fs from "fs";
import * as path from "path";
import type { Community, ArchivedCommunity, LinkStatus } from "../../src/types/community";
import { validateDiscordLink } from "../validate/discord";
import { validateTelegramLink } from "../validate/telegram";
import { validateWhatsappLink } from "../validate/whatsapp";
import { verifySourceMentionsInvite } from "../validate/verifySource";
import { isJobRelevant, classifyJobScamRisk } from "../safety/jobRiskClassifier";
import { validateCommunitiesData } from "./validateSchema";
import { atomicWriteJson } from "./mergeListings";
import { getCurrentIsoTimestamp } from "../../src/lib/dates";
import { autoPublishConfig } from "../../src/config/autoPublish";
import { evaluateAutoPublishCandidate, validateCountryEvidence } from "./autoPublish";

export interface RevalidationResult {
  totalChecked: number;
  activeRetained: number;
  autoUnpublished: number;
  downgradedSourceCount: number;
  temporaryUnknownCount: number;
  unpublishedRecords: ArchivedCommunity[];
}

export interface RevalidationValidators {
  discordValidator?: (url: string) => Promise<any>;
  telegramValidator?: (url: string) => Promise<any>;
  whatsappValidator?: (url: string) => Promise<any>;
  sourceVerifier?: (sourceUrl: string, inviteUrl: string, guildId?: string) => Promise<any>;
}

/**
 * Revalidates all published communities in groups.json, updates fresh metadata,
 * downgrades stale source verifications (and re-evaluates Tier B eligibility),
 * and auto-unpublishes dead/unsafe listings.
 * Atomically persists changes to groups.json and archived-groups.json.
 */
export async function runRevalidatePublished(
  options = autoPublishConfig,
  customDataDir?: string,
  validators: RevalidationValidators = {}
): Promise<RevalidationResult> {
  console.log("=========================================");
  console.log("?? AUTOMATED PUBLISHED REVALIDATION ENGINE");
  console.log("=========================================");

  const dataDir = customDataDir || path.resolve(process.cwd(), "src/data");
  const groupsPath = path.join(dataDir, "groups.json");
  const archivedPath = path.join(dataDir, "archived-groups.json");

  const published: Community[] = fs.existsSync(groupsPath)
    ? JSON.parse(fs.readFileSync(groupsPath, "utf-8"))
    : [];
  let archived: ArchivedCommunity[] = fs.existsSync(archivedPath)
    ? JSON.parse(fs.readFileSync(archivedPath, "utf-8"))
    : [];

  console.log(`[revalidate] Checking ${published.length} published communities in ${dataDir}...`);

  const nowIso = getCurrentIsoTimestamp();
  const nowMs = Date.now();
  const retained: Community[] = [];
  const newlyArchived: ArchivedCommunity[] = [];
  let downgradedSourceCount = 0;
  let temporaryUnknownCount = 0;

  for (const item of published) {
    console.log(`  ?? Revalidating [${item.platform.toUpperCase()}] "${item.title}" (${item.inviteUrl})...`);

    let validationResult;
    try {
      if (item.platform === "discord") {
        const validateFn = validators.discordValidator || validateDiscordLink;
        validationResult = await validateFn(item.inviteUrl);
      } else if (item.platform === "telegram") {
        const validateFn = validators.telegramValidator || validateTelegramLink;
        validationResult = await validateFn(item.inviteUrl);
      } else if (item.platform === "whatsapp") {
        const validateFn = validators.whatsappValidator || validateWhatsappLink;
        validationResult = await validateFn(item.inviteUrl);
      } else {
        validationResult = { url: item.inviteUrl, status: "unknown" as LinkStatus, message: "Unsupported platform", checkedAt: nowIso };
      }
    } catch (err: any) {
      validationResult = { url: item.inviteUrl, status: "unknown" as LinkStatus, message: `Revalidation error: ${err.message}`, checkedAt: nowIso };
    }

    item.lastCheckedAt = nowIso;
    item.lastValidationStatus = validationResult.status;

    // A. Conclusive Dead Link (404, invalid invite, deleted guild)
    if (validationResult.status === "dead") {
      console.log(`  ? Dead link confirmed for "${item.title}". Auto-unpublishing.`);
      const archivedRecord: ArchivedCommunity = {
        id: item.id,
        slug: item.slug,
        title: item.title,
        platform: item.platform,
        inviteUrl: item.inviteUrl,
        publishedAt: item.discoveredAt,
        unpublishedAt: nowIso,
        unpublishReason: "dead-link: " + (validationResult.message || "Invite expired or deleted"),
        lastKnownStatus: "dead",
        guildId: item.guildId || null,
        countryCode: item.countryCode,
        category: item.category,
        countryEvidence: item.countryEvidence,
        sourceUrls: item.sourceUrls,
      };
      newlyArchived.push(archivedRecord);
      continue;
    }

    // B. Temporary Error / Unknown Status
    if (validationResult.status === "unknown") {
      item.consecutiveUnknownCount = (item.consecutiveUnknownCount || 0) + 1;
      item.linkStatus = "unknown";
      console.log(`  ? Status unknown for "${item.title}" (Consecutive: ${item.consecutiveUnknownCount}/${options.autoUnpublishUnknownAfter}).`);

      if (item.consecutiveUnknownCount >= options.autoUnpublishUnknownAfter) {
        console.log(`  ? Exceeded consecutive unknown threshold (${options.autoUnpublishUnknownAfter}). Auto-unpublishing.`);
        const archivedRecord: ArchivedCommunity = {
          id: item.id,
          slug: item.slug,
          title: item.title,
          platform: item.platform,
          inviteUrl: item.inviteUrl,
          publishedAt: item.discoveredAt,
          unpublishedAt: nowIso,
          unpublishReason: `repeated-unknown-status (${item.consecutiveUnknownCount} consecutive attempts)`,
          lastKnownStatus: "unknown",
          guildId: item.guildId || null,
          countryCode: item.countryCode,
          category: item.category,
          countryEvidence: item.countryEvidence,
          sourceUrls: item.sourceUrls,
        };
        newlyArchived.push(archivedRecord);
        continue;
      } else {
        temporaryUnknownCount++;
        retained.push(item);
        continue;
      }
    }

    // Active state confirmed
    item.consecutiveUnknownCount = 0;
    item.linkStatus = "active";
    item.lastKnownLinkStatus = "active";
    item.lastSuccessfulValidationAt = nowIso;

    // Refresh member count if returned
    if (validationResult.extractedMemberCount !== undefined && validationResult.extractedMemberCount !== null) {
      item.memberCount = validationResult.extractedMemberCount;
      item.memberCountCheckedAt = nowIso;
      item.memberCountSource = item.inviteUrl;
    }

    // C. Check for Repurposed Server / Safety Changes
    const realTitle = validationResult.extractedTitle?.trim() || item.title;
    const realDesc = validationResult.extractedDescription?.trim() || item.description || "";
    const fullText = `${realTitle} ${realDesc}`.trim();

    if (/\b(inactive|shut\s+down|closed\s+down|no\s+longer\s+active|deleted\s+server|server\s+closed)\b/i.test(realTitle)) {
      console.log(`  ?? Community marked inactive in title: "${realTitle}". Auto-unpublishing.`);
      newlyArchived.push({
        id: item.id,
        slug: item.slug,
        title: realTitle,
        platform: item.platform,
        inviteUrl: item.inviteUrl,
        publishedAt: item.discoveredAt,
        unpublishedAt: nowIso,
        unpublishReason: "server-inactive-or-closed",
        lastKnownStatus: "dead",
        guildId: item.guildId || null,
        countryCode: item.countryCode,
        category: item.category,
      });
      continue;
    }

    const scamCheck = classifyJobScamRisk(fullText);
    if (scamCheck.isSevereScam) {
      console.log(`  ? Severe scam detected in metadata for "${item.title}". Auto-unpublishing.`);
      newlyArchived.push({
        id: item.id,
        slug: item.slug,
        title: realTitle,
        platform: item.platform,
        inviteUrl: item.inviteUrl,
        publishedAt: item.discoveredAt,
        unpublishedAt: nowIso,
        unpublishReason: `severe-safety-violation: ${scamCheck.safetyFlags.join(", ")}`,
        lastKnownStatus: "removed",
        guildId: item.guildId || null,
        countryCode: item.countryCode,
        category: item.category,
      });
      continue;
    }

    const jobCheck = isJobRelevant(fullText);
    if (!jobCheck.isJobRelated) {
      console.log(`  ?? Community no longer job-related: "${item.title}". Auto-unpublishing.`);
      newlyArchived.push({
        id: item.id,
        slug: item.slug,
        title: realTitle,
        platform: item.platform,
        inviteUrl: item.inviteUrl,
        publishedAt: item.discoveredAt,
        unpublishedAt: nowIso,
        unpublishReason: "repurposed-non-job: " + jobCheck.reason,
        lastKnownStatus: "removed",
        guildId: item.guildId || null,
        countryCode: item.countryCode,
        category: item.category,
      });
      continue;
    }

    // D. Periodic Source Recheck controlled by sourceCheckedAt (every 30 days)
    if (item.verificationStatus === "source-confirmed" && item.sourceUrls && item.sourceUrls.length > 0) {
      const lastSourceCheck = item.sourceCheckedAt
        ? new Date(item.sourceCheckedAt).getTime()
        : new Date(item.discoveredAt).getTime();
      const sourceAgeDays = (nowMs - lastSourceCheck) / (1000 * 60 * 60 * 24);

      if (sourceAgeDays >= 30) {
        console.log(`  ?? Rechecking independent sources for "${item.title}" (Age: ${Math.round(sourceAgeDays)}d)...`);
        let confirmedResult: any = null;
        const verifierFn = validators.sourceVerifier || verifySourceMentionsInvite;

        for (const sUrl of item.sourceUrls) {
          const check = await verifierFn(sUrl, item.inviteUrl, item.guildId || undefined);
          if (check.isConfirmed) {
            confirmedResult = check;
            break;
          }
        }

        item.sourceCheckedAt = nowIso;

        if (confirmedResult) {
          item.sourceVerification = {
            status: "confirmed",
            checkedAt: nowIso,
            sourceUrl: confirmedResult.sourceUrl,
            inviteUrl: item.inviteUrl,
            matchedBy: confirmedResult.matchedBy || "exact-href",
            matchedGuildId: confirmedResult.matchedGuildId || item.guildId || null,
            evidenceSnippet: confirmedResult.evidenceSnippet || null,
          };
        } else {
          console.log(`  ?? No independent source confirmed invite for "${item.title}". Downgrading and re-evaluating Tier B eligibility.`);
          item.verificationStatus = "unverified";
          item.sourceVerification = null;
          downgradedSourceCount++;

          // Re-evaluate country evidence if it previously relied on the downgraded source
          if (
            item.countryEvidence?.sourceType === "independent-source" ||
            item.countryEvidence?.sourceType === "official-source"
          ) {
            const countryCheck = validateCountryEvidence({ ...item, countryEvidence: null });
            if (countryCheck.isValid && countryCheck.evidence) {
              item.countryEvidence = countryCheck.evidence;
            } else {
              item.countryEvidence = null;
            }
          }

          // Evaluate Tier B eligibility
          const tierBEval = evaluateAutoPublishCandidate(item, [], [], {
            maxValidationAgeHours: options.maxValidationAgeHours,
            tierBRequiredObservations: options.tierBRequiredObservations,
          });

          if (tierBEval.eligible && tierBEval.tier === "B") {
            item.publicationTier = "B";
            console.log(`  ? Community "${item.title}" independently qualifies for Tier B. Retained published as unverified.`);
          } else {
            console.log(`  ? Community "${item.title}" does not qualify for Tier B (${tierBEval.blockedReasons.join(", ")}). Auto-unpublishing.`);
            newlyArchived.push({
              id: item.id,
              slug: item.slug,
              title: item.title,
              platform: item.platform,
              inviteUrl: item.inviteUrl,
              publishedAt: item.discoveredAt,
              unpublishedAt: nowIso,
              unpublishReason: `source-downgraded-tier-b-ineligible: ${tierBEval.blockedReasons.join(", ")}`,
              lastKnownStatus: "removed",
              guildId: item.guildId || null,
              countryCode: item.countryCode,
              category: item.category,
              countryEvidence: item.countryEvidence,
              sourceUrls: item.sourceUrls,
            });
            continue;
          }
        }
      }
    }

    item.updatedAt = nowIso;
    retained.push(item);
    console.log(`  ? Retained active published: "${item.title}" (${item.linkStatus} - ${item.verificationStatus})`);
  }

  // Atomically persist datasets whenever revalidation runs
  const updatedArchived = [...archived, ...newlyArchived];
  retained.sort((a, b) => a.title.localeCompare(b.title));

  const valPub = validateCommunitiesData(retained);
  if (!valPub.valid) {
    console.error("? Schema validation failed during revalidation:", valPub.errors);
    throw new Error("Schema validation failure during revalidation");
  }

  atomicWriteJson(groupsPath, valPub.communities);
  if (newlyArchived.length > 0) {
    atomicWriteJson(archivedPath, updatedArchived);
  }

  console.log(`\n? Datasets atomically persisted: ${retained.length} published, ${updatedArchived.length} archived.`);

  console.log("\n=========================================");
  console.log("?? REVALIDATION REPORT");
  console.log("=========================================");
  console.log(`Total checked         : ${published.length}`);
  console.log(`Active retained       : ${retained.length}`);
  console.log(`Auto-unpublished      : ${newlyArchived.length}`);
  console.log(`Source downgraded     : ${downgradedSourceCount}`);
  console.log(`Temporary unknown     : ${temporaryUnknownCount}`);
  console.log("=========================================\n");

  return {
    totalChecked: published.length,
    activeRetained: retained.length,
    autoUnpublished: newlyArchived.length,
    downgradedSourceCount,
    temporaryUnknownCount,
    unpublishedRecords: newlyArchived,
  };
}

if (process.argv[1] && process.argv[1].endsWith("revalidatePublished.ts")) {
  runRevalidatePublished().catch((err) => {
    console.error("? Revalidation encountered a fatal error:", err);
    process.exit(1);
  });
}
