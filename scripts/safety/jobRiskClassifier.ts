export interface JobRelevanceResult {
  isJobRelated: boolean;
  reason?: string;
  matchedKeywords: string[];
}

export interface JobScamRiskResult {
  isSevereScam: boolean;
  safetyFlags: string[];
  reasons: string[];
}

export const STRONG_JOB_TERMS = [
  "job",
  "jobs",
  "hiring",
  "vacancy",
  "vacancies",
  "career",
  "careers",
  "recruitment",
  "recruiter",
  "internship",
  "internships",
  "graduate jobs",
  "new grad",
  "open roles",
  "job posting",
  "job postings",
  "job alert",
  "job alerts",
  "employment",
  "work opportunities",
  "apprenticeship",
  "entry level jobs",
  "full time jobs",
  "talent acquisition",
];

const JOB_KEYWORDS = STRONG_JOB_TERMS;

const PROHIBITED_NICHES = [
  { pattern: /\b(crypto\s+signals|forex\s+signals|binance\s+signals|trading\s+signals|forex\s+scalping|crypto\s+pump|binance\s+futures|forex\s+trading|forex|make\s+money\s+online|usdt\s+task|task\s+jobs|paid\s+tasks|crypto\s+earning)\b/i, reason: "Trading signals or task-earning scheme" },
  { pattern: /\b(airdrop\s+hunters|claim\s+airdrop|free\s+crypto\s+airdrop|crypto\s+airdrop)\b/i, reason: "Crypto airdrops" },
  { pattern: /\b(online\s+casino|sports\s+betting|fixed\s+matches|betting\s+tips|casino\s+bonuses)\b/i, reason: "Gambling or betting" },
  { pattern: /\b(mlm|pyramid\s+scheme|matrix\s+earning|downline\s+earning|mlm\s+matrix)\b/i, reason: "Multi-level marketing scheme" },
  { pattern: /\b(free\s+discord\s+nitro|nitro\s+generator|hacked\s+accounts)\b/i, reason: "Illicit generation or leaks" },
  { pattern: /\b(dropshipping|shopify\s+automation|get\s+rich\s+quick)\b/i, reason: "Get-rich-quick ecommerce course" },
];

const SEVERE_SCAM_PATTERNS = [
  { regex: /\b(pay\s+(?:\$?[0-9]+\s+)?(?:registration\s+)?fee|registration\s+fee|pay\s+to\s+join|pay\s+for\s+equipment|training\s+fee|deposit\s+required|send\s+money\s+first)\b/i, flag: "upfront-payment", reason: "Requires upfront payment/fee for job" },
  { regex: /\b(unlock\s+tasks|optimization\s+task|product\s+boosting|rating\s+tasks|like\s+videos?\s+for\s+(?:money|pay)|watch\s+videos?\s+for\s+cash)\b/i, flag: "task-scam-language", reason: "Task optimization / paid video likes scam" },
  { regex: /\b(crypto\s+deposit|usdt\s+(?:payment|deposit)|deposit\s+usdt|trc20\s+deposit)\b/i, flag: "crypto-payment", reason: "Requires cryptocurrency/USDT deposit" },
  { regex: /\b(reshipping\s+packages?|parcel\s+inspector|package\s+forwarder|money\s+mule|cash\s+flipping|receive\s+packages?\s+and\s+resend)\b/i, flag: "reshipping-scam", reason: "Reshipping / money mule scam pattern" },
  { regex: /\b(guaranteed\s+daily\s+income|earn\s+\$[0-9]{3,4}\s*(?:per|\/)\s*day|instant\s+income|no\s+experience\s+\$[0-9]{3,4}\s*(?:per|\/)\s*day)\b/i, flag: "guaranteed-income", reason: "Unrealistic guaranteed daily income claims" },
];

const NEGATION_PATTERNS = [
  /\bno\s+(?:registration\s+)?fee(?:\s+is\s+required)?\b/gi,
  /\bnever\s+(?:charge|pay|send|require|ask\s+for)\s+(?:any\s+|a\s+)?(?:registration\s+fee|fee|fees|deposit|crypto\s+deposit|crypto(?:\s+to\s+recruiters)?|usdt\s+deposit|usdt|money|payment)\b/gi,
  /\b(?:employers|recruiters|companies)\s+should\s+never\s+ask\s+(?:you\s+)?(?:to\s+pay|for\s+upfront\s+payment)(?:\s+upfront)?\b/gi,
  /\bwe\s+never\s+(?:charge|ask\s+for)\s+(?:registration\s+fees|fees|money|payment|applicants)\b/gi,
  /\b100%\s+free\s+(?:job\s+alerts|to\s+apply|to\s+join)\b/gi,
  /\bfree\s+of\s+charge\b/gi,
];

/**
 * Validates whether a candidate community is genuinely job/career-related.
 */
export function isJobRelevant(text: string): JobRelevanceResult {
  const lower = text.toLowerCase();

  // 1. Check prohibited non-job niches FIRST
  for (const item of PROHIBITED_NICHES) {
    if (item.pattern.test(lower)) {
      // If it contains prohibited terms, it only passes if it has strong legitimate job board intent
      // e.g. "Crypto Developer Jobs" or "AI Engineer Jobs" (NOT "Crypto Signals" or "AI Chat Community" or "USDT Task Jobs")
      const isLegitimateNicheJobBoard = /\b(developer\s+jobs|engineering\s+jobs|tech\s+careers|hiring\s+developers|engineer\s+jobs|ai\s+jobs|fintech\s+careers|recruitment|blockchain\s+developer)\b/i.test(lower);
      if (!isLegitimateNicheJobBoard) {
        return {
          isJobRelated: false,
          reason: `Rejected: ${item.reason}`,
          matchedKeywords: [],
        };
      }
    }
  }

  // 2. Check for explicit job-related career keywords
  const matched = JOB_KEYWORDS.filter((kw) => {
    const regex = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "i");
    return regex.test(lower);
  });

  const hasJobIntent = matched.length > 0;

  // 3. Reject general chat / earning groups with no career intent
  if (/\b(chat\s+community|anime\s+chat|gaming\s+lounge|meme\s+club|hangout)\b/i.test(lower) && !hasJobIntent) {
    return {
      isJobRelated: false,
      reason: "General chat/entertainment community without verified job alert intent.",
      matchedKeywords: [],
    };
  }

  if (hasJobIntent) {
    return {
      isJobRelated: true,
      matchedKeywords: matched,
    };
  }

  return {
    isJobRelated: false,
    reason: "No verified employment, job alert, or hiring keywords found.",
    matchedKeywords: [],
  };
}

/**
 * Classifies job scam risks and flags fraudulent activity.
 * Supports negation context to avoid false-flagging educational/warning copy.
 */
export function classifyJobScamRisk(text: string): JobScamRiskResult {
  const flags: string[] = [];
  const reasons: string[] = [];
  let isSevere = false;

  // Strip legitimate warning/negation patterns first
  let sanitizedForScamCheck = text;
  for (const negPattern of NEGATION_PATTERNS) {
    sanitizedForScamCheck = sanitizedForScamCheck.replace(negPattern, " [CLEARED_WARNING] ");
  }

  for (const item of SEVERE_SCAM_PATTERNS) {
    if (item.regex.test(sanitizedForScamCheck)) {
      flags.push(item.flag);
      reasons.push(item.reason);
      isSevere = true;
    }
  }

  return {
    isSevereScam: isSevere,
    safetyFlags: Array.from(new Set(flags)),
    reasons,
  };
}

/**
 * Pre-filters candidate links by evaluating whether their raw search snippet/title
 * possesses explicit employment intent.
 */
export function hasStrongJobIntent(text: string): { hasIntent: boolean; matched: string[]; reason?: string } {
  if (!text || text.trim().length === 0) {
    return { hasIntent: false, matched: [], reason: "Empty text" };
  }
  const lower = text.toLowerCase();

  for (const item of PROHIBITED_NICHES) {
    if (item.pattern.test(lower)) {
      const isJobBoard = /\b(developer\s+jobs|engineering\s+jobs|tech\s+careers|hiring\s+developers|engineer\s+jobs|ai\s+jobs|fintech\s+careers|recruitment|blockchain\s+developer)\b/i.test(lower);
      if (!isJobBoard) {
        return { hasIntent: false, matched: [], reason: `Prohibited niche: ${item.reason}` };
      }
    }
  }

  const matched = STRONG_JOB_TERMS.filter((kw) => {
    const regex = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "i");
    return regex.test(lower);
  });

  if (matched.length > 0) {
    return { hasIntent: true, matched };
  }

  return {
    hasIntent: false,
    matched: [],
    reason: "No strong job-intent keywords found (e.g. jobs, hiring, careers, internships, vacancies).",
  };
}
