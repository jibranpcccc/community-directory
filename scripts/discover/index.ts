import "../utilities/loadEnv";
import * as fs from "fs";
import * as path from "path";
import { discoveryConfig } from "../../src/config/discovery";
import { generateSearchQueries } from "./generateQueries";
import { GeminiGoogleSearchProvider } from "./geminiSearch";
import { ManualSeedProvider, type DiscoveryResult } from "./discoverySources";
import { normalizeInviteUrl, generateSlug } from "../../src/lib/urls";
import { isDuplicateListing } from "../data/deduplicate";
import { classifyCommunityWithGemini } from "../classify/classifyCommunity";
import { mergeListingsIntoFile } from "../data/mergeListings";
import { getCurrentIsoTimestamp } from "../../src/lib/dates";
import type { Community } from "../../src/types/community";

// Parse CLI flags robustly
const isDryRun = process.argv.some((arg) => arg.includes("dry-run"));
const limitIndex = process.argv.findIndex((arg) => arg === "--limit");
const limitCount = limitIndex !== -1 && process.argv[limitIndex + 1]
  ? parseInt(process.argv[limitIndex + 1], 10)
  : discoveryConfig.maxNewCandidatesPerRun;

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

  const allKnown = [...published, ...pending];
  const existingSlugs = allKnown.map((c) => c.slug);

  console.log(`[discover] Current indexed database: ${published.length} published, ${pending.length} pending.`);

  // 1. Generate bounded search queries
  const queries = generateSearchQueries(discoveryConfig.maxQueriesPerRun);
  console.log(`[discover] Generated ${queries.length} search queries.`);

  // 2. Initialize discovery providers
  const geminiProvider = new GeminiGoogleSearchProvider();
  const seedProvider = new ManualSeedProvider();

  if (!geminiProvider.isAvailable()) {
    console.warn("⚠️  GEMINI_API_KEY is not set. Live search grounding is disabled.");
    console.log("ℹ️  Running discovery via manual seeds and heuristic parsers.");
  }

  const rawResults: DiscoveryResult[] = [];

  // Add seeds
  if (seedProvider.isAvailable()) {
    const seedResults = await seedProvider.search();
    console.log(`[discover] Loaded ${seedResults.length} manual seeds from seeds.json.`);
    rawResults.push(...seedResults);
  }

  // Run search queries if Gemini is configured
  if (geminiProvider.isAvailable()) {
    console.log(`[discover] Executing search grounding queries with model ${discoveryConfig.geminiModel}...`);
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      if (rawResults.length >= limitCount) break;

      const results = await geminiProvider.search(q.query, {
        platform: q.platform,
        category: q.category,
        subcategory: q.subcategory,
      });

      if (results.length > 0) {
        console.log(`  [search] Query #${i + 1} (${q.query}) found ${results.length} candidate(s).`);
        rawResults.push(...results);
      }

      // Rate limit delay between API queries
      if (i < queries.length - 1) {
        await new Promise((r) => setTimeout(r, discoveryConfig.requestDelayMs));
      }
    }
  }

  console.log(`[discover] Total discovered raw candidate links: ${rawResults.length}`);

  // 3. Deduplicate candidates against database and within batch
  const uniqueCandidates: DiscoveryResult[] = [];
  const batchSeenUrls = new Set<string>();
  let duplicateCount = 0;

  for (const raw of rawResults) {
    const normalized = normalizeInviteUrl(raw.url);
    if (!normalized || batchSeenUrls.has(normalized)) {
      duplicateCount++;
      continue;
    }

    const dupCheck = isDuplicateListing({ inviteUrl: normalized, platform: raw.platform }, allKnown);
    if (dupCheck.isDuplicate) {
      duplicateCount++;
      continue;
    }

    batchSeenUrls.add(normalized);
    uniqueCandidates.push({ ...raw, url: normalized });
    if (uniqueCandidates.length >= limitCount) break;
  }

  console.log(`[dedupe] Filtered out ${duplicateCount} duplicate or invalid candidate(s).`);
  console.log(`[discover] Processing ${uniqueCandidates.length} new unique candidates.`);

  if (uniqueCandidates.length === 0) {
    console.log("✨ No new communities found in this run. Everything is up to date.");
    return;
  }

  // 4. Classify and transform into Community records
  const newCommunities: Community[] = [];
  const now = getCurrentIsoTimestamp();

  for (let i = 0; i < uniqueCandidates.length; i++) {
    const cand = uniqueCandidates[i];
    console.log(`  [classify] (#${i + 1}/${uniqueCandidates.length}) Classifying ${cand.url}...`);

    const classification = await classifyCommunityWithGemini({
      inviteUrl: cand.url,
      platform: cand.platform,
      evidenceText: cand.snippet,
      suggestedCategory: cand.category,
      suggestedSubcategory: cand.subcategory,
    });

    const slug = generateSlug(classification.title, cand.platform, existingSlugs);
    existingSlugs.push(slug);

    const validSource = cand.sourceUrl.startsWith("http")
      ? cand.sourceUrl
      : cand.url;

    const community: Community = {
      id: slug,
      slug,
      title: classification.title,
      platform: cand.platform,
      category: classification.category,
      subcategory: classification.subcategory,
      tags: classification.tags,
      inviteUrl: cand.url,
      description: classification.description,
      language: classification.language,
      country: classification.country,
      accessType: classification.accessType,
      communityType: classification.communityType,
      memberCount: null,
      memberCountSource: null,
      memberCountCheckedAt: null,
      verificationStatus: "unverified",
      linkStatus: "active",
      sourceUrls: [validSource],
      discoveryMethod: geminiProvider.isAvailable() ? "gemini-search" : "manual",
      discoveredAt: now,
      lastCheckedAt: now,
      updatedAt: now,
      safetyFlags: classification.safetyFlags,
      published: discoveryConfig.autoPublish,
      featured: false,
    };

    newCommunities.push(community);
  }

  // 5. Output or Save Results
  if (isDryRun) {
    console.log("\n📋 DRY RUN COMPLETED — Discovered Communities:");
    newCommunities.forEach((c) => {
      console.log(` - [${c.platform.toUpperCase()}] ${c.title} (${c.category}) => ${c.inviteUrl}`);
    });
    console.log("\n✅ Dry run completed without modifying datasets.");
    return;
  }

  const targetPath = discoveryConfig.autoPublish ? groupsPath : pendingPath;
  const targetName = discoveryConfig.autoPublish ? "groups.json" : "pending-groups.json";

  const mergeResult = mergeListingsIntoFile(targetPath, newCommunities);
  console.log(`\n🎉 Successfully added ${mergeResult.addedCount} new communities to ${targetName}. Total in file: ${mergeResult.totalCount}.`);
}

runDiscovery().catch((err) => {
  console.error("❌ Discovery run failed with error:", err);
  process.exit(1);
});
