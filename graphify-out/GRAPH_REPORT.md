# Graph Report - .  (2026-08-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 271 nodes · 581 edges · 14 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `71d548d6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DirectoryLayout.astro
- discover/index.ts
- scripts
- community.ts
- group/[slug].astro
- pages/index.astro
- communities.ts
- compilerOptions
- validate/index.ts
- dependencies

## God Nodes (most connected - your core abstractions)
1. `scripts` - 15 edges
2. `PlatformId` - 15 edges
3. `Community` - 12 edges
4. `runDiscovery()` - 10 edges
5. `performHttpLinkCheck()` - 9 edges
6. `siteConfig` - 9 edges
7. `compilerOptions` - 9 edges
8. `generateCollectionPageSchema()` - 8 edges
9. `classifyCommunityWithGemini()` - 7 edges
10. `categories` - 7 edges

## Surprising Connections (you probably didn't know these)
- `SearchQuery` --references--> `PlatformId`  [EXTRACTED]
  scripts/discover/generateQueries.ts → src/types/community.ts
- `runDiscovery()` --calls--> `getCurrentIsoTimestamp()`  [EXTRACTED]
  scripts/discover/index.ts → src/lib/dates.ts
- `CandidateDiscovery` --references--> `PlatformId`  [EXTRACTED]
  scripts/discover/parseCandidates.ts → src/types/community.ts
- `runApprove()` --calls--> `getCurrentIsoTimestamp()`  [EXTRACTED]
  scripts/utilities/approve.ts → src/lib/dates.ts
- `classifyCommunityWithGemini()` --references--> `@google/generative-ai`  [EXTRACTED]
  scripts/classify/classifyCommunity.ts → package.json

## Import Cycles
- None detected.

## Communities (14 total, 0 thin omitted)

### Community 0 - "DirectoryLayout.astro"
Cohesion: 0.07
Nodes (30): ../config/site, ../lib/communities, ../lib/schema, ../lib/seo, ../styles/global.css, allItems, siteConfig, seo (+22 more)

### Community 1 - "discover/index.ts"
Cohesion: 0.11
Nodes (24): @google/generative-ai, @google/generative-ai, classifyCommunityWithGemini(), fallbackHeuristicClassification(), detectSafetyFlags(), sanitizePlainText(), DiscoveryProvider, DiscoveryResult (+16 more)

### Community 2 - "scripts"
Cohesion: 0.07
Nodes (28): description, devDependencies, tsx, @types/node, typescript, vitest, name, scripts (+20 more)

### Community 3 - "community.ts"
Cohesion: 0.14
Nodes (19): ../../lib/filters, ClassificationResult, activePlatforms, filterAndSortCommunities(), sortCommunities(), normalizeSearchText(), searchCommunities(), allPublished (+11 more)

### Community 4 - "group/[slug].astro"
Cohesion: 0.14
Nodes (14): ../config/platforms, ../lib/dates, ../types/community, runApprove(), config, getPlatformById(), formatDate(), getCurrentIsoTimestamp() (+6 more)

### Community 5 - "pages/index.astro"
Cohesion: 0.13
Nodes (13): ../config/categories, config, categories, getCategoryBySlug(), platforms, getRecentlyChecked(), featuredListings, recentAdditions (+5 more)

### Community 6 - "communities.ts"
Cohesion: 0.13
Nodes (16): stats, allCommunities, getAllCommunities(), getAllTagsWithCounts(), getCommunitiesByPlatform(), getCommunitiesByTag(), getCommunityBySlug(), getDatasetStats() (+8 more)

### Community 7 - "compilerOptions"
Cohesion: 0.12
Nodes (16): astro.config.mjs, astro/tsconfigs/strict, scripts/**/*, src/**/*, tests/**/*, compilerOptions, baseUrl, module (+8 more)

### Community 8 - "validate/index.ts"
Cohesion: 0.41
Nodes (8): validateDiscordLink(), validateGenericLink(), runLinkValidation(), validateTelegramLink(), LinkValidationResult, performHttpLinkCheck(), validateWhatsappLink(), LinkStatus

### Community 9 - "dependencies"
Cohesion: 0.18
Nodes (11): astro, @astrojs/sitemap, @astrojs/tailwind, dependencies, astro, @astrojs/sitemap, @astrojs/tailwind, tailwindcss (+3 more)

## Knowledge Gaps
- **84 isolated node(s):** `name`, `type`, `version`, `description`, `dev` (+79 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@google/generative-ai` connect `discover/index.ts` to `dependencies`?**
  _High betweenness centrality (0.235) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `discover/index.ts`, `scripts`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **Why does `PlatformId` connect `discover/index.ts` to `community.ts`, `communities.ts`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _84 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `DirectoryLayout.astro` be split into smaller, more focused modules?**
  _Cohesion score 0.07320024198427103 - nodes in this community are weakly interconnected._
- **Should `discover/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10993657505285412 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._