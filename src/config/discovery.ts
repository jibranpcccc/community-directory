export const discoveryConfig = {
  // Query budget (optimized for daily automated runs within Gemini limits)
  maxQueriesPerRun: parseInt(process.env.DISCOVERY_MAX_QUERIES || "15", 10),
  maxCandidatesPerQuery: 10,
  maxNewCandidatesPerRun: parseInt(process.env.DISCOVERY_MAX_CANDIDATES || "20", 10),
  
  // Rate limiting delay between search queries (ms)
  requestDelayMs: parseInt(process.env.DISCOVERY_REQUEST_DELAY_MS || "2000", 10),
  
  // Publication safety policy (true = auto publish directly to groups.json)
  autoPublish: process.env.AUTO_PUBLISH_DISCOVERED === "true",
  
  // Gemini model settings
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  geminiSearchEnabled: process.env.GEMINI_SEARCH_ENABLED !== "false",
  
  // Target platforms for discovery
  supportedPlatforms: ["telegram", "whatsapp", "discord"] as const,
  
  // High-risk keywords to flag
  suspiciousKeywords: [
    "guaranteed profit",
    "100% win rate",
    "risk-free return",
    "double your money",
    "free money",
    "insider signals",
    "pump and dump",
    "leak vip",
    "hacked accounts",
    "free nitro generator",
  ],
};
