export const discoveryConfig = {
  // Query budget (optimized for daily automated runs within Gemini limits)
  maxQueriesPerRun: parseInt(process.env.DISCOVERY_MAX_QUERIES || "30", 10),
  maxCandidatesPerQuery: 10,
  maxNewCandidatesPerRun: parseInt(process.env.DISCOVERY_MAX_CANDIDATES || "30", 10),

  // Rate limiting delay between search queries (ms)
  requestDelayMs: parseInt(process.env.DISCOVERY_REQUEST_DELAY_MS || "1500", 10),

  // Publication safety policy (false = route discoveries strictly to pending-groups.json)
  autoPublish: process.env.AUTO_PUBLISH_DISCOVERED === "true",

  // Gemini model settings
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  geminiSearchEnabled: process.env.GEMINI_SEARCH_ENABLED !== "false",

  // Target platforms for discovery
  supportedPlatforms: ["telegram", "discord", "whatsapp"] as const,

  // Country discovery allocation weights
  countryWeights: {
    US: 0.40, // 40%
    GB: 0.25, // 25%
    CA: 0.20, // 20%
    AU: 0.15, // 15%
  },

  // Platform discovery allocation weights
  platformWeights: {
    telegram: 0.40, // 40%
    discord: 0.35,  // 35%
    whatsapp: 0.25, // 25%
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
