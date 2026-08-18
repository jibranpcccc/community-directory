import "../utilities/loadEnv";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { discoveryConfig } from "../../src/config/discovery";
import { generateSearchQueries } from "./generateQueries";
import { GeminiGoogleSearchProvider } from "./geminiSearch";
import { ManualSeedProvider, type DiscoveryResult } from "./discoverySources";
import { normalizeInviteUrl, generateSlug } from "../../src/lib/urls";
import { isDuplicateListing } from "../data/deduplicate";
import { classifyCommunityWithGemini } from "../classify/classifyCommunity";
import { validateDiscordLink } from "../validate/discord";
import { validateTelegramLink } from "../validate/telegram";
import { validateWhatsappLink } from "../validate/whatsapp";
import type { LinkValidationResult } from "../validate/validateUrl";
import { atomicWriteJson } from "../data/mergeListings";
import { getCurrentIsoTimestamp } from "../../src/lib/dates";
import type { Community } from "../../src/types/community";

// Parse CLI flags
const isDryRun = process.argv.some((arg) => arg.includes("dry-run"));
const limitIndex = process.argv.findIndex((arg) => arg === "--limit");
const maxTargetNew = limitIndex !== -1 && process.argv[limitIndex + 1]
  ? parseInt(process.argv[limitIndex + 1], 10)
  : 30;

const queriesIndex = process.argv.findIndex((arg) => arg === "--queries");
const maxQueriesToRun = queriesIndex !== -1 && process.argv[queriesIndex + 1]
  ? parseInt(process.argv[queriesIndex + 1], 10)
  : discoveryConfig.maxQueriesPerRun;

async function runDiscovery() {
  console.log("=========================================");
  console.log(`🌐 COMMUNITY DISCOVERY ENGINE ${isDryRun ? "[DRY RUN]" : ""}`);
  console.log("=========================================");

  const dataDir = path.resolve(process.cwd(), "src/data");
  const groupsPath = path.join(dataDir, "groups.json");
  const pendingPath = path.join(dataDir, "pending-groups.json");

  // Load existing datasets
  const published: Community[] = fs.existsSync(groupsPath)
    ? JSON.parse(fs.readFileSync(groupsPath, "utf-8"))
    : [];
  const pending: Community[] = fs.existsSync(pendingPath)
    ? JSON.parse(fs.readFileSync(pendingPath, "utf-8"))
    : [];

  const initialPendingBackup = JSON.stringify(pending, null, 2);
  const allKnown = [...published, ...pending];
  const existingSlugs = allKnown.map((c) => c.slug);

  console.log(`[discover] Current indexed database: ${published.length} published, ${pending.length} pending.`);

  // 1. Generate bounded search queries across platforms and categories
  const queries = generateSearchQueries(maxQueriesToRun);
  console.log(`[discover] Generated ${queries.length} diverse search queries.`);

  // 2. Initialize discovery providers
  const geminiProvider = new GeminiGoogleSearchProvider();
  const seedProvider = new ManualSeedProvider();

  let queriesUsedCount = 0;
  const rawResults: DiscoveryResult[] = [];

  // Add seeds if available and needed
  if (seedProvider.isAvailable()) {
    const seedResults = await seedProvider.search();
    if (seedResults.length > 0) {
      console.log(`[discover] Loaded ${seedResults.length} manual seeds from seeds.json.`);
      rawResults.push(...seedResults);
    }
  }

  // Run search queries with Gemini Google Search Grounding
  if (geminiProvider.isAvailable()) {
    console.log(`[discover] Executing search grounding queries with model ${discoveryConfig.geminiModel}...`);
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      queriesUsedCount++;

      console.log(`  [search] Query #${i + 1}/${queries.length} [${q.platform.toUpperCase()}] "${q.query}"...`);
      const results = await geminiProvider.search(q.query, {
        platform: q.platform,
        category: q.category,
        subcategory: q.subcategory,
      });

      if (results.length > 0) {
        console.log(`    -> Found ${results.length} raw candidate link(s).`);
        rawResults.push(...results);
      }

      // Check if we have enough raw candidates
      if (rawResults.length >= maxTargetNew * 3) {
        console.log(`[discover] Acquired sufficient candidate pool (${rawResults.length} raw candidates).`);
        break;
      }

      // Rate limit delay between API queries
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
  let validCandidatesCount = 0;
  let rejectedInvalidCount = 0;
  let duplicatesSkippedCount = 0;
  let newDiscordCount = 0;
  let newTelegramCount = 0;
  let newWhatsappCount = 0;

  const validNewCommunities: Community[] = [];
  const batchSeenUrls = new Set<string>();
  const batchSeenTitles = new Set<string>();

  const now = getCurrentIsoTimestamp();

  for (let i = 0; i < rawResults.length; i++) {
    if (validNewCommunities.length >= maxTargetNew) {
      break;
    }

    const cand = rawResults[i];
    const normalizedUrl = normalizeInviteUrl(cand.url);

    if (!normalizedUrl) {
      rejectedInvalidCount++;
      continue;
    }

    // A. In-batch URL deduplication
    if (batchSeenUrls.has(normalizedUrl)) {
      duplicatesSkippedCount++;
      continue;
    }

    // B. Check against both groups.json and pending-groups.json
    const dupCheck = isDuplicateListing(
      { inviteUrl: normalizedUrl, platform: cand.platform },
      allKnown
    );
    if (dupCheck.isDuplicate) {
      duplicatesSkippedCount++;
      continue;
    }

    // C. Platform-specific validation
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

    // Reject dead/invalid links
    if (validation.status === "dead") {
      console.log(`  ❌ Rejected [${cand.platform}]: ${normalizedUrl} (${validation.message || "Dead or invalid"})`);
      rejectedInvalidCount++;
      continue;
    }

    validCandidatesCount++;

    // D. Extract real metadata
    const realTitle = validation.extractedTitle?.trim() || "";
    const realDesc = validation.extractedDescription?.trim() || "";
    const realMembers = validation.extractedMemberCount ?? null;

    // Check title in-batch duplicate
    if (realTitle) {
      const cleanTitleKey = `${cand.platform}:${realTitle.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      if (batchSeenTitles.has(cleanTitleKey)) {
        duplicatesSkippedCount++;
        continue;
      }
      batchSeenTitles.add(cleanTitleKey);
    }

    // Also check title duplicate against allKnown
    if (realTitle) {
      const titleDupCheck = isDuplicateListing(
        { inviteUrl: normalizedUrl, platform: cand.platform, title: realTitle },
        allKnown
      );
      if (titleDupCheck.isDuplicate) {
        duplicatesSkippedCount++;
        continue;
      }
    }

    batchSeenUrls.add(normalizedUrl);

    // E. Classification & Tagging
    console.log(`  🔍 Classifying [${cand.platform.toUpperCase()}] "${realTitle || normalizedUrl}"...`);
    const classification = await classifyCommunityWithGemini({
      inviteUrl: normalizedUrl,
      platform: cand.platform,
      evidenceText: `${realTitle} ${realDesc} ${cand.snippet || ""}`.trim(),
      suggestedCategory: cand.category,
      suggestedSubcategory: cand.subcategory,
    });

    const finalTitle = realTitle || classification.title || "Community";
    const slug = generateSlug(finalTitle, cand.platform, existingSlugs);
    existingSlugs.push(slug);

    // Determine clean source URL (never google.com/search)
    let validSource = cand.sourceUrl;
    if (!validSource || validSource.includes("google.com/search") || !validSource.startsWith("http")) {
      validSource = normalizedUrl;
    }

    const isSourceConfirmed = Boolean(
      validSource &&
      !validSource.includes("discord.gg") &&
      !validSource.includes("t.me") &&
      !validSource.includes("chat.whatsapp.com") &&
      validSource.startsWith("http")
    );

    const community: Community = {
      id: slug,
      slug,
      title: finalTitle,
      platform: cand.platform,
      category: classification.category,
      subcategory: classification.subcategory,
      tags: classification.tags,
      inviteUrl: normalizedUrl,
      description: realDesc || classification.description,
      language: classification.language,
      country: classification.country,
      accessType: classification.accessType,
      communityType: classification.communityType,
      memberCount: realMembers,
      memberCountSource: realMembers ? (validSource.startsWith("http") ? validSource : normalizedUrl) : null,
      memberCountCheckedAt: realMembers ? now : null,
      verificationStatus: isSourceConfirmed ? "source-confirmed" : "unverified",
      linkStatus: validation.status,
      sourceUrls: [validSource],
      discoveryMethod: geminiProvider.isAvailable() ? "gemini-search" : "manual",
      discoveredAt: now,
      lastCheckedAt: now,
      updatedAt: now,
      safetyFlags: classification.safetyFlags,
      published: false, // Strictly false: discoveries only go to pending-groups.json
      featured: false,
    };

    validNewCommunities.push(community);
    allKnown.push(community);

    if (cand.platform === "discord") newDiscordCount++;
    else if (cand.platform === "telegram") newTelegramCount++;
    else if (cand.platform === "whatsapp") newWhatsappCount++;

    console.log(`  ✅ Added to pending: [${cand.platform.toUpperCase()}] "${community.title}" (${community.category})`);

    // Brief delay to be polite to APIs
    await new Promise((r) => setTimeout(r, 300));
  }

  // 4. Output / Save Results
  const totalNewPending = validNewCommunities.length;

  if (isDryRun) {
    console.log("\n📋 DRY RUN COMPLETED — Discovered Communities (Not Saved):");
    validNewCommunities.forEach((c) => {
      console.log(` - [${c.platform.toUpperCase()}] ${c.title} (${c.category}) => ${c.inviteUrl}`);
    });
  } else if (totalNewPending > 0) {
    // Merge new communities into pending-groups.json atomically
    const existingPending: Community[] = fs.existsSync(pendingPath)
      ? JSON.parse(fs.readFileSync(pendingPath, "utf-8"))
      : [];

    const updatedPending = [...existingPending, ...validNewCommunities];
    atomicWriteJson(pendingPath, updatedPending);

    // 5. Verification & Rollback Protection
    console.log("\n🔒 Running automated verification tests...");
    try {
      execSync("npm run validate-data", { stdio: "inherit" });
      execSync("npm run test", { stdio: "inherit" });
      console.log("✅ Verification passed: Schemas and test suites are 100% healthy.");
    } catch (testError: any) {
      console.error("❌ Post-discovery verification failed! Rolling back pending-groups.json...");
      fs.writeFileSync(pendingPath, initialPendingBackup, "utf-8");
      console.log("⏪ Rollback complete: Restored original pending-groups.json.");
      throw testError;
    }
  }

  // 6. Print required execution report
  console.log("\n=========================================");
  console.log("📊 DISCOVERY EXECUTION REPORT");
  console.log("=========================================");
  console.log(`Queries used: ${queriesUsedCount}`);
  console.log(`Raw candidates: ${rawCandidatesCount}`);
  console.log(`Valid candidates: ${validCandidatesCount}`);
  console.log(`Rejected invalid: ${rejectedInvalidCount}`);
  console.log(`Duplicates skipped: ${duplicatesSkippedCount}`);
  console.log(`New Discord: ${newDiscordCount}`);
  console.log(`New Telegram: ${newTelegramCount}`);
  console.log(`New WhatsApp: ${newWhatsappCount}`);
  console.log(`Total new pending: ${totalNewPending}`);
  console.log("=========================================\n");
}

runDiscovery().catch((err) => {
  console.error("❌ Discovery run encountered fatal error:", err);
  process.exit(1);
});
