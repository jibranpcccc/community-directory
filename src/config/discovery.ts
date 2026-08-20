export const discoveryConfig = {
  // Daily discovery targets (10–30 high quality Tier-1 communities)
  minTargetNewPerDay: 10,
  maxTargetNewPerDay: 30,
  maxQueriesPerRun: parseInt(process.env.DISCOVERY_MAX_QUERIES || "60", 10),
  maxCandidatesPerQuery: 10,
  maxNewCandidatesPerRun: parseInt(process.env.DISCOVERY_MAX_CANDIDATES || "30", 10),

  // Rate limiting delay between search queries (ms)
  requestDelayMs: parseInt(process.env.DISCOVERY_REQUEST_DELAY_MS || "1500", 10),

  // Publication safety policy (fail-closed: requires explicit AUTO_PUBLISH_ENABLED="true")
  autoPublish: process.env.AUTO_PUBLISH_ENABLED === "true",

  // Gemini model settings
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  geminiSearchEnabled: process.env.GEMINI_SEARCH_ENABLED !== "false",

  // Target platforms for discovery
  supportedPlatforms: ["telegram", "discord", "whatsapp"] as const,

  // Country discovery allocation weights (US: 40%, GB: 25%, CA: 20%, AU: 15%)
  countryWeights: {
    US: 0.40,
    GB: 0.25,
    CA: 0.20,
    AU: 0.15,
  },

  // Platform discovery allocation weights (Discord: 50%, Telegram: 35%, WhatsApp: 15%)
  platformWeights: {
    discord: 0.50,
    telegram: 0.35,
    whatsapp: 0.15,
  },

  // Category discovery budget allocations (Tier A: 90%, Tier B: 10%)
  categoryWeights: {
    "tech-jobs": 0.25,                 // 25%
    "remote-jobs": 0.20,               // 20%
    "internships-graduate": 0.20,      // 20%
    "visa-sponsorship-jobs": 0.15,     // 15%
    "healthcare-jobs": 0.10,           // 10%
    "finance-jobs": 0.025,             // 2.5%
    "engineering-jobs": 0.025,         // 2.5%
    "sales-marketing-jobs": 0.025,     // 2.5%
    "government-jobs": 0.025,          // 2.5%
  },

  // High-risk job scam phrases that trigger safetyFlags or rejection
  jobScamKeywords: [
    "pay to join",
    "registration fee",
    "training fee required",
    "deposit required",
    "crypto deposit",
    "usdt payment",
    "unlock tasks",
    "optimization task",
    "product boosting",
    "rating tasks",
    "like videos for money",
    "guaranteed daily income",
    "earn $500 per day",
    "instant income",
    "no experience $1000/day",
    "send money first",
    "equipment payment",
    "check reimbursement",
    "reshipping packages",
    "parcel inspector",
    "money mule",
    "cash flipping",
  ],

  // Prohibited niches (reject immediately unless legitimate hiring/job context exists)
  disallowedNicheKeywords: [
    "crypto signals",
    "forex signals",
    "binary options",
    "airdrop",
    "pump and dump",
    "casino",
    "sports betting",
    "mlm",
    "pyramid scheme",
    "free nitro",
    "crack software",
    "onlyfans leak",
  ],
};
