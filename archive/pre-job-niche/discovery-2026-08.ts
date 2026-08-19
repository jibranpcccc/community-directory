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
