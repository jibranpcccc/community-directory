import "../utilities/loadEnv";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { discoveryConfig } from "../../src/config/discovery";
import { generateSearchQueries, loadQueryStats, saveQueryStats, type SearchQuery, type QueryStats } from "./generateQueries";
import { GeminiGoogleSearchProvider, isSearchEngineOrRedirectUrl } from "./geminiSearch";
import { ManualSeedProvider, type DiscoveryResult } from "./discoverySources";
import { normalizeInviteUrl, generateSlug } from "../../src/lib/urls";
import { isDuplicateListing } from "../data/deduplicate";
import { classifyJobCommunityWithGemini } from "../classify/classifyCommunity";
import { isJobRelevant, classifyJobScamRisk, hasStrongJobIntent } from "../safety/jobRiskClassifier";
import { validateDiscordLink } from "../validate/discord";
import { validateTelegramLink } from "../validate/telegram";
import { validateWhatsappLink } from "../validate/whatsapp";
import { verifySourceMentionsInvite } from "../validate/verifySource";
import type { LinkValidationResult } from "../validate/validateUrl";
import { atomicWriteJson } from "../data/mergeListings";
import { getCurrentIsoTimestamp } from "../../src/lib/dates";
import type { Community, CountryCode, ExperienceLevel } from "../../src/types/community";

// Parse CLI flags
const isDryRun = process.argv.some((arg) => arg.includes("dry-run"));
const limitIndex = process.argv.findIndex((arg) => arg === "--limit");
const maxTargetNew = limitIndex !== -1 && process.argv[limitIndex + 1]
  ? parseInt(process.argv[limitIndex + 1], 10)
  : discoveryConfig.maxNewCandidatesPerRun;

const queriesIndex = process.argv.findIndex((arg) => arg === "--queries");
const maxQueriesToRun = queriesIndex !== -1 && process.argv[queriesIndex + 1]
  ? parseInt(process.argv[queriesIndex + 1], 10)
  : discoveryConfig.maxQueriesPerRun;

interface RejectedRecord {
  url: string;
  platform: string;
  reason: string;
  date: string;
  title?: string;
}

async function runDiscovery() {
  console.log("=========================================");
  console.log(`🎯 JOB COMMUNITY DISCOVERY ENGINE ${isDryRun ? "[DRY RUN]" : ""}`);
  console.log("=========================================");

  const dataDir = path.resolve(process.cwd(), "src/data");
  const groupsPath = path.join(dataDir, "groups.json");
  const pendingPath = path.join(dataDir, "pending-groups.json");
  const rejectedPath = path.join(dataDir, "rejected-candidates.json");

  // Load existing datasets
  const publishedGroups: Community[] = fs.existsSync(groupsPath)
    ? JSON.parse(fs.readFileSync(groupsPath, "utf-8"))
    : [];
  const initialPendingBackup = fs.existsSync(pendingPath)
    ? fs.readFileSync(pendingPath, "utf-8")
    : "[]";
  const pendingGroups: Community[] = JSON.parse(initialPendingBackup);
  const rejectedRecords: RejectedRecord[] = fs.existsSync(rejectedPath)
    ? JSON.parse(fs.readFileSync(rejectedPath, "utf-8"))
    : [];

  const allKnown: Community[] = [...publishedGroups, ...pendingGroups];
  const existingSlugs = allKnown.map((c) => c.slug);
  const queryStatsMap = loadQueryStats();

  console.log(`[discover] Current indexed database: ${publishedGroups.length} published, ${pendingGroups.length} pending.`);

  // 1. Generate precision-focused search queries
  const queries = generateSearchQueries(maxQueriesToRun);
  console.log(`[discover] Generated ${queries.length} country-balanced, high-intent job queries.`);

  // 2. Fetch candidates via Gemini Live Google Search Grounding
  const geminiProvider = new GeminiGoogleSearchProvider();
  const rawResults: (DiscoveryResult & { queryMeta?: SearchQuery; title?: string })[] = [];
  let queriesUsedCount = 0;

  if (geminiProvider.isAvailable()) {
    console.log(`[discover] Executing job search queries with model ${discoveryConfig.geminiModel}...`);
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      console.log(`  [search] Query #${i + 1}/${queries.length} [${q.countryCode} - ${q.platform.toUpperCase()}] ${q.query}...`);
      queriesUsedCount++;

      const results = await geminiProvider.search(q.query, {
        platform: q.platform,
        category: q.category,
        subcategory: q.subcategory,
      });

      let validForQuery = 0;
      for (const r of results) {
        if (!isSearchEngineOrRedirectUrl(r.url)) {
          rawResults.push({ ...r, queryMeta: q });
          validForQuery++;
        }
      }

      // Update query performance tracking
      const statKey = q.query;
      queryStatsMap[statKey] = {
        query: q.query,
        lastRunAt: getCurrentIsoTimestamp(),
        rawCandidateCount: (queryStatsMap[statKey]?.rawCandidateCount || 0) + validForQuery,
        activeCandidateCount: queryStatsMap[statKey]?.activeCandidateCount || 0,
        wrongNicheCount: queryStatsMap[statKey]?.wrongNicheCount || 0,
        newPendingCount: queryStatsMap[statKey]?.newPendingCount || 0,
        duplicateCount: queryStatsMap[statKey]?.duplicateCount || 0,
      };

      if (validForQuery > 0) {
        console.log(`    -> Found ${validForQuery} raw candidate link(s).`);
      }

      if (rawResults.length >= maxTargetNew * 4) {
        console.log(`[discover] Acquired sufficient candidate pool (${rawResults.length} raw candidates).`);
        break;
      }

      if (i < queries.length - 1) {
        await new Promise((r) => setTimeout(r, discoveryConfig.requestDelayMs));
      }
    }
  } else {
    console.warn("⚠️  GEMINI_API_KEY is not set. Live search grounding is disabled.");
  }

  const rawCandidatesCount = rawResults.length;
  console.log(`\n[discover] Total discovered raw candidate links: ${rawCandidatesCount}`);

  // 3. Platform Validation & Duplicate Checking Pipeline
  let activeCandidatesCount = 0;
  let unknownRejectedCount = 0;
  let deadRejectedCount = 0;
  let wrongNicheCount = 0;
  let wrongCountryCount = 0;
  let unconfirmedCountryCount = 0;
  let scamRiskCount = 0;
  let duplicatesSkippedCount = 0;

  const countryCounts: Record<CountryCode, number> = { US: 0, GB: 0, CA: 0, AU: 0, NZ: 0, IE: 0 };
  let newDiscordCount = 0;
  let newTelegramCount = 0;
  let newWhatsappCount = 0;

  const categoryCounts = {
    "tech-jobs": 0,
    "remote-jobs": 0,
    "internships-graduate": 0,
    "visa-sponsorship-jobs": 0,
    "healthcare-jobs": 0,
    "other": 0,
  };

  const validNewCommunities: Community[] = [];
  const batchSeenUrls = new Set<string>();
  const batchSeenGuildIds = new Set<string>();

  const now = getCurrentIsoTimestamp();

  for (let i = 0; i < rawResults.length; i++) {
    if (validNewCommunities.length >= maxTargetNew) {
      break;
    }

    const cand = rawResults[i];
    const normalizedUrl = normalizeInviteUrl(cand.url);

    if (!normalizedUrl) {
      deadRejectedCount++;
      continue;
    }

    // A. In-batch URL deduplication
    if (batchSeenUrls.has(normalizedUrl)) {
      duplicatesSkippedCount++;
      continue;
    }

    // B. Preliminary check against known records by URL
    const preDupCheck = isDuplicateListing(
      { inviteUrl: normalizedUrl, platform: cand.platform },
      allKnown
    );
    if (preDupCheck.isDuplicate) {
      console.log(`  ⚠ Duplicate skipped [URL]: ${normalizedUrl} (${preDupCheck.reason})`);
      duplicatesSkippedCount++;
      continue;
    }

    // C. Early Job-Intent Pre-Filtering on Search Snippet/Title
    const rawSearchText = `${cand.title || ""} ${cand.snippet || ""}`.trim();
    if (rawSearchText.length > 5) {
      const intentCheck = hasStrongJobIntent(rawSearchText);
      if (!intentCheck.hasIntent) {
        console.log(`  ⚠️ Pre-filtered [No Job Intent in Snippet]: "${cand.title || cand.url}" (${intentCheck.reason})`);
        wrongNicheCount++;
        rejectedRecords.push({
          url: normalizedUrl,
          platform: cand.platform,
          title: cand.title,
          reason: `Pre-filtered: ${intentCheck.reason}`,
          date: now,
        });
        continue;
      }
    }

    // D. Platform-specific live validation
    let validation: LinkValidationResult;
    try {
      if (cand.platform === "discord") {
        validation = await validateDiscordLink(normalizedUrl);
      } else if (cand.platform === "telegram") {
        validation = await validateTelegramLink(normalizedUrl);
      } else if (cand.platform === "whatsapp") {
        validation = await validateWhatsappLink(normalizedUrl);
      } else {
        validation = { url: normalizedUrl, status: "unknown", message: "Unsupported platform", checkedAt: now };
      }
    } catch (err: any) {
      validation = { url: normalizedUrl, status: "unknown", message: `Validation error: ${err.message}`, checkedAt: now };
    }

    // STRICT STATUS RULE: ONLY accept active links
    if (validation.status === "dead") {
      console.log(`  ✗ Rejected [Dead] [${cand.platform}]: ${normalizedUrl} (${validation.message || "Dead or expired link"})`);
      deadRejectedCount++;
      rejectedRecords.push({ url: normalizedUrl, platform: cand.platform, reason: "dead-link", date: now });
      continue;
    }

    if (validation.status === "unknown") {
      console.log(`  ⏳ Held/Rejected [Unknown] [${cand.platform}]: ${normalizedUrl} (${validation.message || "Unverified/uncertain link status"})`);
      unknownRejectedCount++;
      rejectedRecords.push({ url: normalizedUrl, platform: cand.platform, reason: "unknown-status", date: now });
      continue;
    }

    if (validation.status !== "active") {
      console.log(`  ✗ Rejected [Non-Active] [${cand.platform}]: ${normalizedUrl} (${validation.status})`);
      deadRejectedCount++;
      continue;
    }

    activeCandidatesCount++;

    // E. Extract genuine metadata
    const realTitle = validation.extractedTitle?.trim() || "";
    const realDesc = validation.extractedDescription?.trim() || "";
    const realMembers = validation.extractedMemberCount ?? null;
    const extractedGuildId = validation.extractedGuildId || undefined;

    // F. Strict Job Relevance Validation on Extracted Platform Text
    const candidateFullText = `${realTitle} ${realDesc} ${cand.snippet || ""}`.trim();
    const jobCheck = isJobRelevant(candidateFullText);
    if (!jobCheck.isJobRelated) {
      console.log(`  ✗ Rejected [Wrong Niche]: "${realTitle || normalizedUrl}" (${jobCheck.reason || "Not job-related"})`);
      wrongNicheCount++;
      rejectedRecords.push({ url: normalizedUrl, platform: cand.platform, reason: "wrong-niche", title: realTitle, date: now });
      continue;
    }

    // G. Strict Job Scam Risk Check
    const scamCheck = classifyJobScamRisk(candidateFullText);
    if (scamCheck.isSevereScam) {
      console.log(`  ✗ Rejected [Scam Risk]: "${realTitle || normalizedUrl}" (${scamCheck.reasons.join("; ")})`);
      scamRiskCount++;
      rejectedRecords.push({ url: normalizedUrl, platform: cand.platform, reason: "job-scam-risk", title: realTitle, date: now });
      continue;
    }

    // Discord Guild ID deduplication
    if (extractedGuildId) {
      if (batchSeenGuildIds.has(extractedGuildId)) {
        console.log(`  ⚠ Duplicate skipped [In-Batch Guild ID]: ${extractedGuildId} (${normalizedUrl})`);
        duplicatesSkippedCount++;
        continue;
      }
      batchSeenGuildIds.add(extractedGuildId);

      const guildDupCheck = isDuplicateListing(
        { inviteUrl: normalizedUrl, platform: cand.platform, guildId: extractedGuildId },
        allKnown
      );
      if (guildDupCheck.isDuplicate) {
        console.log(`  ⚠ Duplicate skipped [Guild ID]: ${extractedGuildId} (${guildDupCheck.reason})`);
        duplicatesSkippedCount++;
        continue;
      }
    }

    batchSeenUrls.add(normalizedUrl);

    // H. Strict Source Verification: Fetch independent source page and check for exact outbound href
    const sourceCheck = await verifySourceMentionsInvite(cand.sourceUrl, normalizedUrl, extractedGuildId);
    const validSource = sourceCheck.sourceUrl;
    const isSourceConfirmed = sourceCheck.isConfirmed;

    // I. Job Classification & Tagging
    console.log(`  🔍 Classifying [${cand.platform.toUpperCase()}] "${realTitle || normalizedUrl}"...`);
    const classification = await classifyJobCommunityWithGemini({
      inviteUrl: normalizedUrl,
      platform: cand.platform,
      evidenceText: (realDesc || (isSourceConfirmed ? sourceCheck.evidenceSnippet || "" : "") || realTitle || "").slice(0, 150),
      suggestedCountryCode: cand.queryMeta?.countryCode,
      suggestedCategory: cand.category,
      suggestedSubcategory: cand.subcategory,
      suggestedCity: cand.queryMeta?.targetCity,
    });

    const finalTitle = realTitle || classification.title || "Job Community";

    // 1. Inactive Server Filter
    if (/\b(inactive|shut\s+down|closed\s+down|no\s+longer\s+active|deleted\s+server|server\s+closed)\b/i.test(finalTitle)) {
      console.log(`  ⚠️ Rejected [Inactive Server]: "${finalTitle}"`);
      rejectedRecords.push({
        url: normalizedUrl,
        platform: cand.platform,
        title: finalTitle,
        reason: "server-inactive-or-closed",
        date: now,
      });
      wrongNicheCount++;
      continue;
    }

    // 2. Re-verify Job Intent on Platform Extracted Content
    const fullPlatformText = `${finalTitle} ${realDesc || ""}`.trim();
    const platformRelevance = isJobRelevant(fullPlatformText);
    if (!platformRelevance.isJobRelated) {
      console.log(`  ⚠️ Rejected [Wrong Niche on Platform]: "${finalTitle}" (${platformRelevance.reason})`);
      rejectedRecords.push({
        url: normalizedUrl,
        platform: cand.platform,
        title: finalTitle,
        reason: `Platform title/description not job related: ${platformRelevance.reason}`,
        date: now,
      });
      wrongNicheCount++;
      continue;
    }

    // 3. Strict Tier-1 Target Market Gate (US, GB, CA, AU)
    const TIER_1_SET = new Set(["US", "GB", "CA", "AU"]);
    if (!classification.countryCode || !TIER_1_SET.has(classification.countryCode)) {
      const reason = classification.countryCode
        ? `wrong-country: ${classification.countryCode}`
        : "unconfirmed-target-market";
      console.log(`  ⚠️ Held/Rejected [Country Gate]: "${finalTitle}" (${reason})`);
      rejectedRecords.push({
        url: normalizedUrl,
        platform: cand.platform,
        title: finalTitle,
        reason,
        date: now,
      });
      if (reason.startsWith("wrong-country")) wrongCountryCount++;
      else unconfirmedCountryCount++;
      continue;
    }

    const slug = generateSlug(finalTitle, cand.platform, existingSlugs);
    existingSlugs.push(slug);

    // Zero-Fabrication Description Policy
    let finalDescription: string | null = null;
    if (realDesc && realDesc.length > 5) {
      finalDescription = realDesc.slice(0, 400);
    } else if (sourceCheck.isConfirmed && sourceCheck.evidenceSnippet && sourceCheck.evidenceSnippet.length > 15) {
      finalDescription = sourceCheck.evidenceSnippet.slice(0, 400);
    } else {
      finalDescription = null;
    }

    const memberCountSourceUrl = realMembers !== null ? normalizedUrl : null;
    const VALID_EXP_LEVELS = new Set(["internship", "entry-level", "graduate", "mid-level", "senior", "executive"]);
    const validExpLevels = Array.isArray(classification.experienceLevels)
      ? (classification.experienceLevels as string[])
          .map((el) => el.toLowerCase().trim())
          .filter((el) => VALID_EXP_LEVELS.has(el)) as ExperienceLevel[]
      : [];

    const community: Community = {
      id: slug,
      slug,
      title: finalTitle,
      platform: cand.platform,
      vertical: "jobs",
      category: classification.category,
      subcategory: classification.subcategory,
      tags: classification.tags,
      inviteUrl: normalizedUrl,
      description: finalDescription,
      language: classification.language,
      country: classification.country,
      countryCode: classification.countryCode,
      city: classification.city,
      jobTypes: classification.jobTypes,
      industries: classification.industries,
      workArrangement: classification.workArrangement,
      experienceLevels: validExpLevels,
      visaSponsorship: classification.visaSponsorship,
      accessType: classification.accessType,
      communityType: classification.communityType,
      memberCount: realMembers,
      memberCountSource: memberCountSourceUrl,
      memberCountCheckedAt: realMembers ? now : null,
      verificationStatus: isSourceConfirmed ? "source-confirmed" : "unverified",
      linkStatus: "active",
      sourceUrls: [validSource],
      guildId: extractedGuildId || null,
      discoveryMethod: geminiProvider.isAvailable() ? "gemini-search" : "manual",
      discoveredAt: now,
      lastCheckedAt: now,
      updatedAt: now,
      safetyFlags: classification.safetyFlags,
      published: false,
      featured: false,
    };

    validNewCommunities.push(community);
    allKnown.push(community);

    if (community.countryCode) {
      countryCounts[community.countryCode] = (countryCounts[community.countryCode] || 0) + 1;
    }

    if (cand.platform === "discord") newDiscordCount++;
    else if (cand.platform === "telegram") newTelegramCount++;
    else if (cand.platform === "whatsapp") newWhatsappCount++;

    // Track category breakdown
    const cat = community.category;
    if (cat in categoryCounts) {
      categoryCounts[cat as keyof typeof categoryCounts]++;
    } else {
      categoryCounts["other"]++;
    }

    console.log(`  ✅ Added to pending: [${cand.platform.toUpperCase()}] "${community.title}" (${community.countryCode} - ${community.category})`);

    // Polite API delay
    await new Promise((r) => setTimeout(r, 300));
  }

  // 4. Output / Save Results
  const totalNewPending = validNewCommunities.length;

  if (isDryRun) {
    console.log("\n🧪 DRY RUN COMPLETED — Discovered Job Communities (Not Saved):");
    validNewCommunities.forEach((c) => {
      console.log(` - [${c.platform.toUpperCase()}] [${c.countryCode || "UNKNOWN"}] ${c.title} (${c.category}) => ${c.inviteUrl}`);
    });
  } else if (totalNewPending > 0) {
    const existingPending: Community[] = fs.existsSync(pendingPath)
      ? JSON.parse(fs.readFileSync(pendingPath, "utf-8"))
      : [];

    const updatedPending = [...existingPending, ...validNewCommunities];
    atomicWriteJson(pendingPath, updatedPending);
    atomicWriteJson(rejectedPath, rejectedRecords);
    saveQueryStats(queryStatsMap);

    // 5. Verification & Rollback Protection
    console.log("\n🧪 Running automated verification tests...");
    try {
      execSync("npm run validate-data", { stdio: "inherit" });
      execSync("npm run test", { stdio: "inherit" });
      console.log("✓ Verification passed: Schemas and test suites are 100% healthy.");
    } catch (testError: any) {
      console.error("✗ Post-discovery verification failed! Rolling back pending-groups.json...");
      fs.writeFileSync(pendingPath, initialPendingBackup, "utf-8");
      console.log("✓ Rollback complete: Restored original pending-groups.json.");
      throw testError;
    }
  } else {
    saveQueryStats(queryStatsMap);
  }

  // 6. Print Sequential Funnel Report
  console.log("\n=========================================");
  console.log("🎯 JOB DISCOVERY EXECUTION REPORT");
  console.log("=========================================");
  console.log("RAW DISCOVERY");
  console.log(`Raw candidates: ${rawCandidatesCount}`);
  console.log("\nPLATFORM VALIDATION");
  console.log(`Active: ${activeCandidatesCount}`);
  console.log(`Dead: ${deadRejectedCount}`);
  console.log(`Unknown: ${unknownRejectedCount}`);
  console.log(`Other validation failure: 0`);
  console.log("\nACTIVE CANDIDATE FILTERING");
  console.log(`Wrong niche: ${wrongNicheCount}`);
  console.log(`Wrong country: ${wrongCountryCount}`);
  console.log(`Unconfirmed country: ${unconfirmedCountryCount}`);
  console.log(`Scam risk: ${scamRiskCount}`);
  console.log(`Duplicates: ${duplicatesSkippedCount}`);
  console.log("\nFINAL");
  console.log(`New active pending: ${totalNewPending}`);
  console.log("\nCOUNTRY BREAKDOWN");
  console.log(`US: ${countryCounts.US}`);
  console.log(`GB: ${countryCounts.GB}`);
  console.log(`CA: ${countryCounts.CA}`);
  console.log(`AU: ${countryCounts.AU}`);
  console.log("\nPLATFORM BREAKDOWN");
  console.log(`Telegram: ${newTelegramCount}`);
  console.log(`Discord: ${newDiscordCount}`);
  console.log(`WhatsApp: ${newWhatsappCount}`);
  console.log("\nCATEGORY BREAKDOWN");
  console.log(`Tech Jobs: ${categoryCounts["tech-jobs"]}`);
  console.log(`Remote Jobs: ${categoryCounts["remote-jobs"]}`);
  console.log(`Internships/New Grad: ${categoryCounts["internships-graduate"]}`);
  console.log(`Visa Sponsorship: ${categoryCounts["visa-sponsorship-jobs"]}`);
  console.log(`Healthcare: ${categoryCounts["healthcare-jobs"]}`);
  console.log(`Other: ${categoryCounts["other"]}`);
  console.log("=========================================\n");
}

runDiscovery().catch((err) => {
  console.error("✗ Discovery run encountered fatal error:", err);
  process.exit(1);
});
