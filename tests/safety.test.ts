import { describe, it, expect } from "vitest";
import { categories, getCategoryBySlug } from "../src/config/categories";
import { discoveryConfig } from "../src/config/discovery";
import { sanitizePlainText, detectSafetyFlags } from "../scripts/classify/normalizeMetadata";
import { fallbackHeuristicClassification } from "../scripts/classify/classifyCommunity";
import { normalizeInviteUrl } from "../src/lib/urls";
import { CommunitySchema } from "../scripts/data/validateSchema";

describe("Financial Risk Disclaimer Trigger Logic", () => {
  it("enforces financialDisclaimerRequired on high-risk categories", () => {
    const cryptoCategory = getCategoryBySlug("crypto-web3");
    const forexCategory = getCategoryBySlug("forex-stocks");

    expect(cryptoCategory?.financialDisclaimerRequired).toBe(true);
    expect(forexCategory?.financialDisclaimerRequired).toBe(true);
  });

  it("does not require financial disclaimers for non-financial categories", () => {
    const techCategory = getCategoryBySlug("ai-tech");
    const dealsCategory = getCategoryBySlug("deals-coupons");
    const remoteWorkCategory = getCategoryBySlug("online-earning-remote-work");

    expect(techCategory?.financialDisclaimerRequired).toBe(false);
    expect(dealsCategory?.financialDisclaimerRequired).toBe(false);
    expect(remoteWorkCategory?.financialDisclaimerRequired).toBe(false);
  });

  it("safely handles non-existent or invalid category lookups", () => {
    expect(getCategoryBySlug("invalid-category-xyz")).toBeUndefined();
    expect(getCategoryBySlug("")).toBeUndefined();
  });

  it("verifies all configured categories have explicit boolean financialDisclaimerRequired", () => {
    for (const cat of categories) {
      expect(typeof cat.financialDisclaimerRequired).toBe("boolean");
    }
  });
});

describe("Scam, Malware & Suspicious Keyword Detection", () => {
  it("detects all configured high-risk keywords in candidate text", () => {
    for (const keyword of discoveryConfig.suspiciousKeywords) {
      const testText = `Join this exclusive channel for ${keyword} and instant results!`;
      const flags = detectSafetyFlags(testText);
      expect(flags).toContain("potential-risk-language");
    }
  });

  it("is case-insensitive when detecting safety flags", () => {
    const upperText = "GET 100% WIN RATE TRADING SIGNALS!";
    const mixedText = "DoUbLe YoUr MoNeY in 24 hours guaranteed";
    const capitalText = "PUMP AND DUMP VIP LEAK";

    expect(detectSafetyFlags(upperText)).toContain("potential-risk-language");
    expect(detectSafetyFlags(mixedText)).toContain("potential-risk-language");
    expect(detectSafetyFlags(capitalText)).toContain("potential-risk-language");
  });

  it("allows legitimate, clean technical community descriptions without false flags", () => {
    const cleanTexts = [
      "Open-source Python developers learning machine learning and LLMs.",
      "A community for TypeScript and React frontend engineers.",
      "Official Ethereum protocol discussion and smart contract security.",
      "Forex economic calendar discussion and fundamental analysis education.",
      "SaaS discounts, dev tool coupons, and promotional deals.",
    ];

    for (const text of cleanTexts) {
      const flags = detectSafetyFlags(text);
      expect(flags).toEqual([]);
    }
  });

  it("handles null, undefined, empty, or whitespace-only text safely", () => {
    expect(detectSafetyFlags(null)).toEqual([]);
    expect(detectSafetyFlags(undefined)).toEqual([]);
    expect(detectSafetyFlags("")).toEqual([]);
    expect(detectSafetyFlags("   \n\t  ")).toEqual([]);
  });

  it("attaches safety flags during heuristic classification for flagged text", () => {
    const scamCandidate = {
      inviteUrl: "https://t.me/free_crypto_signals",
      platform: "telegram" as const,
      evidenceText: "Join for guaranteed profit and daily insider signals.",
      suggestedCategory: "crypto-web3",
    };

    const result = fallbackHeuristicClassification(scamCandidate);
    expect(result.safetyFlags).toContain("potential-risk-language");
  });

  it("keeps safety flags empty during heuristic classification for legitimate text", () => {
    const cleanCandidate = {
      inviteUrl: "https://discord.gg/reactjs",
      platform: "discord" as const,
      evidenceText: "Official community for React framework developers and maintainers.",
      suggestedCategory: "ai-tech",
    };

    const result = fallbackHeuristicClassification(cleanCandidate);
    expect(result.safetyFlags).toEqual([]);
  });
});

describe("Plaintext & Content Sanitization", () => {
  it("strips malicious HTML tags and potential XSS vectors", () => {
    const input = `<script>alert('xss')</script><b>Bold Community</b><img src="x" onerror="alert(1)">`;
    const sanitized = sanitizePlainText(input);
    expect(sanitized).toBe("alert('xss')Bold Community");
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("<b>");
    expect(sanitized).not.toContain("<img");
  });

  it("strips non-printable and control characters while preserving valid Unicode", () => {
    const raw = "Python 开发者 \x00\x07\x1B Community 🎉 & España!";
    const sanitized = sanitizePlainText(raw);
    expect(sanitized).toContain("Python 开发者");
    expect(sanitized).toContain("Community");
    expect(sanitized).toContain("España");
    expect(sanitized).not.toContain("\x00");
    expect(sanitized).not.toContain("\x07");
    expect(sanitized).not.toContain("\x1B");
  });

  it("truncates text exceeding maxLength and appends ellipsis", () => {
    const longText = "A".repeat(600);
    const sanitized = sanitizePlainText(longText, 100);
    expect(sanitized?.length).toBe(103); // 100 chars + "..."
    expect(sanitized?.endsWith("...")).toBe(true);
  });

  it("returns null for empty, whitespace, or pure HTML inputs", () => {
    expect(sanitizePlainText(null)).toBeNull();
    expect(sanitizePlainText(undefined)).toBeNull();
    expect(sanitizePlainText("")).toBeNull();
    expect(sanitizePlainText("   \n   ")).toBeNull();
    expect(sanitizePlainText("<div><p></p></div>")).toBeNull();
  });
});

describe("URL Safety & Protocol Sanitization", () => {
  it("ensures https protocol and strips tracking params", () => {
    const raw = "http://t.me/secure_chat?utm_source=evil&fbclid=tracking";
    const normalized = normalizeInviteUrl(raw);
    expect(normalized).toBe("https://t.me/secure_chat");
    expect(normalized.startsWith("https://")).toBe(true);
  });

  it("handles non-string or empty inputs safely", () => {
    expect(normalizeInviteUrl("")).toBe("");
    expect(normalizeInviteUrl(null as any)).toBe("");
    expect(normalizeInviteUrl(undefined as any)).toBe("");
  });
});

describe("Safety & Anti-Hallucination Schema Rules", () => {
  const baseValidRecord = {
    id: "safe-comm-1",
    slug: "safe-comm-1",
    title: "Safe Community",
    platform: "telegram",
    category: "ai-tech",
    tags: ["tech"],
    inviteUrl: "https://t.me/safe_community",
    verificationStatus: "source-confirmed",
    linkStatus: "active",
    sourceUrls: ["https://example.com"],
    discoveryMethod: "manual",
    discoveredAt: "2026-08-18T12:00:00.000Z",
    published: true,
  };

  it("accepts valid safetyFlags in community schema", () => {
    const recordWithFlags = {
      ...baseValidRecord,
      safetyFlags: ["potential-risk-language"],
    };

    const parsed = CommunitySchema.safeParse(recordWithFlags);
    expect(parsed.success).toBe(true);
  });

  it("strictly restricts verificationStatus to the 4 canonical fact-first states", () => {
    const validStatuses = [
      "unverified",
      "source-confirmed",
      "owner-confirmed",
      "manually-reviewed",
    ];

    for (const status of validStatuses) {
      const parsed = CommunitySchema.safeParse({
        ...baseValidRecord,
        verificationStatus: status,
      });
      expect(parsed.success).toBe(true);
    }

    // Rejects fabricated / commercial badges
    const invalidStatuses = ["top-rated", "verified", "gold-tier", "official", "trending"];
    for (const status of invalidStatuses) {
      const parsed = CommunitySchema.safeParse({
        ...baseValidRecord,
        verificationStatus: status,
      });
      expect(parsed.success).toBe(false);
    }
  });
});
