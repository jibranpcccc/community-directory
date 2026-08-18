export const discoveryConfig = {
  // Query budget
  maxQueriesPerRun: parseInt(process.env.DISCOVERY_MAX_QUERIES || "30", 10),
  maxCandidatesPerQuery: 10,
  maxNewCandidatesPerRun: parseInt(process.env.DISCOVERY_MAX_CANDIDATES || "100", 10),
  
  // Rate limiting (ms)
  requestDelayMs: parseInt(process.env.DISCOVERY_REQUEST_DELAY_MS || "1200", 10),
  
  // Publication safety policy
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
