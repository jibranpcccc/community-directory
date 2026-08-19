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

export interface RevalidationResult {
  totalChecked: number;
  activeRetained: number;
  autoUnpublished: number;
  downgradedSourceCount: number;
  temporaryUnknownCount: number;
  unpublishedRecords: ArchivedCommunity[];
}

/**
 * Revalidates all published communities in groups.json, updates fresh metadata,
 * downgrades stale source verifications, and auto-unpublishes dead/unsafe listings.
 */
export async function runRevalidatePublished(options = autoPublishConfig): Promise<RevalidationResult> {
  console.log("=========================================");
  console.log("?? AUTOMATED PUBLISHED REVALIDATION ENGINE");
  console.log("=========================================");

  const dataDir = path.resolve(process.cwd(), "src/data");
  const groupsPath = path.join(dataDir, "groups.json");
  const archivedPath = path.join(dataDir, "archived-groups.json");

  const published: Community[] = fs.existsSync(groupsPath)
    ? JSON.parse(fs.readFileSync(groupsPath, "utf-8"))
    : [];
  const archived: ArchivedCommunity[] = fs.existsSync(archivedPath)
    ? JSON.parse(fs.readFileSync(archivedPath, "utf-8"))
    : [];

  console.log(`[revalidate] Checking ${published.length} published communities...`);

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
        validationResult = await validateDiscordLink(item.inviteUrl);
      } else if (item.platform === "telegram") {
        validationResult = await validateTelegramLink(item.inviteUrl);
      } else if (item.platform === "whatsapp") {
        validationResult = await validateWhatsappLink(item.inviteUrl);
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
      };
      newlyArchived.push(archivedRecord);
      continue;
    }

    // B. Temporary Error / Unknown Status
    if (validationResult.status === "unknown") {
      item.consecutiveUnknownCount = (item.consecutiveUnknownCount || 0) + 1;
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
        };
        newlyArchived.push(archivedRecord);
        continue;
      } else {
        temporaryUnknownCount++;
        retained.push(item);
        continue;
      }
    }

    // Reset consecutive unknown count on active validation
    item.consecutiveUnknownCount = 0;
    item.linkStatus = "active";

    // Refresh member count if returned
    if (validationResult.extractedMemberCount !== undefined && validationResult.extractedMemberCount !== null) {
      item.memberCount = validationResult.extractedMemberCount;
      item.memberCountCheckedAt = nowIso;
    }

    // C. Check for Repurposed Server / Safety Changes
    const realTitle = validationResult.extractedTitle?.trim() || item.title;
    const realDesc = validationResult.extractedDescription?.trim() || item.description || "";
    const fullText = `${realTitle} ${realDesc}`.trim();

    // Check Inactive server markers in title
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

    // Check Scam Risk
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

    // Check Job Relevance (Repurposed Server)
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

    // D. Periodic Source Recheck (every 30 days)
    if (item.verificationStatus === "source-confirmed" && item.sourceUrls.length > 0) {
      const lastSourceCheck = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
      const sourceAgeDays = (nowMs - lastSourceCheck) / (1000 * 60 * 60 * 24);

      if (sourceAgeDays >= 30) {
        console.log(`  ?? Rechecking independent source for "${item.title}" (${item.sourceUrls[0]})...`);
        const sourceCheck = await verifySourceMentionsInvite(item.sourceUrls[0], item.inviteUrl, item.guildId || undefined);
        if (!sourceCheck.isConfirmed) {
          console.log(`  ?? Source link no longer active on "${item.sourceUrls[0]}". Downgrading to unverified.`);
          item.verificationStatus = "unverified";
          downgradedSourceCount++;
        }
      }
    }

    item.updatedAt = nowIso;
    retained.push(item);
    console.log(`  ? Retained active published: "${item.title}" (${item.verificationStatus})`);
  }

  // Update datasets
  if (newlyArchived.length > 0 || downgradedSourceCount > 0) {
    const updatedArchived = [...archived, ...newlyArchived];
    retained.sort((a, b) => a.title.localeCompare(b.title));

    const valPub = validateCommunitiesData(retained);
    if (!valPub.valid) {
      console.error("? Schema validation failed during revalidation:", valPub.errors);
      throw new Error("Schema validation failure during revalidation");
    }

    atomicWriteJson(groupsPath, valPub.communities);
    atomicWriteJson(archivedPath, updatedArchived);

    console.log(`\n? Datasets updated: ${retained.length} active published, ${updatedArchived.length} total archived.`);
  }

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
