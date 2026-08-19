import { describe, it, expect } from "vitest";
import { isJobRelevant, classifyJobScamRisk, hasStrongJobIntent } from "../scripts/safety/jobRiskClassifier";
import { TARGET_COUNTRIES, ENABLED_COUNTRIES, getCountryByCode, getCountryBySlug } from "../src/config/countries";
import { JOB_TYPES, getJobTypeBySlug } from "../src/config/jobTypes";
import { INDUSTRIES, getIndustryBySlug } from "../src/config/industries";

describe("Job Relevance Classification", () => {
  it("accepts legitimate job and career vacancy descriptions", () => {
    const samples = [
      "London Tech Jobs - Software engineering and developer vacancies in the UK.",
      "Remote Python Jobs - Full-time and contract positions for US engineers.",
      "NHS Nursing Careers - Healthcare job opportunities in Manchester and Leeds.",
      "Canada Tech Internships - Graduate careers and co-op openings in Toronto.",
      "Sydney Finance and Accounting Recruitment - Banking job alerts in Australia.",
    ];

    for (const text of samples) {
      const res = isJobRelevant(text);
      expect(res.isJobRelated).toBe(true);
      expect(res.matchedKeywords.length).toBeGreaterThan(0);
    }
  });

  it("accepts legitimate niche job groups (AI, FinTech, Blockchain careers)", () => {
    const validNicheJobs = [
      "AI Engineer Jobs USA",
      "Blockchain Developer Jobs UK",
      "FinTech Careers London",
      "Crypto Engineering Jobs",
      "Healthcare AI Jobs",
    ];

    for (const text of validNicheJobs) {
      const res = isJobRelevant(text);
      expect(res.isJobRelated).toBe(true);
      expect(res.matchedKeywords.length).toBeGreaterThan(0);
    }
  });

  it("strictly rejects non-job signals, chats, and earning schemes", () => {
    const invalidSamples = [
      "Crypto Signals",
      "AI Chat Community",
      "Forex Trading",
      "Make Money Online",
      "USDT Task Jobs",
      "VIP Crypto Signals 100x Binance Futures Daily Pump",
      "Forex Scalping Signals and Gold Technical Analysis",
      "Free Airdrop Hunters and Crypto Claiming Community",
      "Online Casino Bonuses and Sports Betting Tips",
      "Join our MLM Matrix Downline for passive crypto earnings",
      "Dropshipping Shopify Automation Mastermind Course",
    ];

    for (const text of invalidSamples) {
      const res = isJobRelevant(text);
      expect(res.isJobRelated).toBe(false);
    }
  });

  it("rejects general non-job conversation when no hiring/career terms exist", () => {
    const text = "Gaming lounge for chatting about Minecraft and anime series.";
    const res = isJobRelevant(text);
    expect(res.isJobRelated).toBe(false);
  });
});

describe("Early Pre-Filtering Job Intent Engine", () => {
  it("identifies strong positive employment intent from search snippets and titles", () => {
    const positiveSnippets = [
      "daily job postings Discord Canada",
      "tech job postings Discord Canada",
      "new grad jobs Discord Canada",
      "internship postings Discord Canada",
      "job alerts Telegram USA",
      "software jobs Telegram USA",
      "remote job alerts Telegram USA",
      "tech hiring Discord USA",
      "UK tech jobs Telegram",
      "job postings Discord UK",
      "London tech jobs Discord",
      "Sydney tech jobs Discord",
      "Australia graduate jobs Telegram",
    ];

    for (const text of positiveSnippets) {
      const res = hasStrongJobIntent(text);
      expect(res.hasIntent).toBe(true);
      expect(res.matched.length).toBeGreaterThan(0);
    }
  });

  it("rejects weak or generic community phrases that lack strong employment intent", () => {
    const weakSnippets = [
      "Canada tech Discord",
      "USA remote community",
      "UK discussion server",
      "Gaming lounge with anime chat",
      "Crypto trading signals VIP",
      "Dropshipping and ecommerce course",
    ];

    for (const text of weakSnippets) {
      const res = hasStrongJobIntent(text);
      expect(res.hasIntent).toBe(false);
    }
  });
});

describe("Job Scam and Fraud Risk Engine with Negation Context", () => {
  it("allows educational/warning statements without triggering false scam flags", () => {
    const educationalSamples = [
      "No registration fee is required",
      "We never charge applicants",
      "Never send crypto to recruiters",
      "Employers should never ask for upfront payment",
      "We never charge registration fees",
      "100% free job alerts to join",
    ];

    for (const text of educationalSamples) {
      const res = classifyJobScamRisk(text);
      expect(res.isSevereScam).toBe(false);
      expect(res.safetyFlags).toEqual([]);
    }
  });

  it("detects and flags actual upfront fee scams", () => {
    const samples = [
      "Pay $50 registration fee to begin",
      "Pay for equipment before your interview",
      "Registration fee required to unlock your training",
    ];

    for (const text of samples) {
      const res = classifyJobScamRisk(text);
      expect(res.isSevereScam).toBe(true);
      expect(res.safetyFlags).toContain("upfront-payment");
    }
  });

  it("detects and flags task optimization / video likes scams", () => {
    const text = "Earn $500/day guaranteed by liking videos and completing tasks.";
    const res = classifyJobScamRisk(text);
    expect(res.isSevereScam).toBe(true);
    expect(res.safetyFlags.some((f) => f === "task-scam-language" || f === "guaranteed-income")).toBe(true);
  });

  it("detects and flags cryptocurrency/USDT deposit schemes", () => {
    const text = "Deposit USDT to unlock tasks in your workbench.";
    const res = classifyJobScamRisk(text);
    expect(res.isSevereScam).toBe(true);
    expect(res.safetyFlags).toContain("crypto-payment");
  });

  it("detects and flags reshipping / package mule scams", () => {
    const samples = [
      "Work from home as a parcel inspector reshipping packages to international clients.",
      "Receive packages and resend them for salary and bonus.",
    ];

    for (const text of samples) {
      const res = classifyJobScamRisk(text);
      expect(res.isSevereScam).toBe(true);
      expect(res.safetyFlags).toContain("reshipping-scam");
    }
  });

  it("detects and flags unrealistic guaranteed income claims", () => {
    const text = "No experience needed. Guaranteed daily income earn $800 per day instantly.";
    const res = classifyJobScamRisk(text);
    expect(res.isSevereScam).toBe(true);
    expect(res.safetyFlags).toContain("guaranteed-income");
  });

  it("returns clean zero flags for genuine corporate job announcements", () => {
    const text = "Stripe is hiring a Senior Frontend Engineer in London. Requirements: React, TypeScript.";
    const res = classifyJobScamRisk(text);
    expect(res.isSevereScam).toBe(false);
    expect(res.safetyFlags).toEqual([]);
  });
});

describe("Target Country Configuration", () => {
  it("has US, GB, CA, AU enabled with proper discovery weights summing to 100%", () => {
    expect(ENABLED_COUNTRIES.length).toBe(4);
    const codes = ENABLED_COUNTRIES.map((c) => c.code);
    expect(codes).toContain("US");
    expect(codes).toContain("GB");
    expect(codes).toContain("CA");
    expect(codes).toContain("AU");

    const totalWeight = ENABLED_COUNTRIES.reduce((sum, c) => sum + c.discoveryBudgetWeight, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });

  it("resolves countries by code and slug accurately", () => {
    expect(getCountryByCode("US")?.name).toBe("United States");
    expect(getCountryByCode("gb")?.name).toBe("United Kingdom");
    expect(getCountryBySlug("canada")?.code).toBe("CA");
    expect(getCountryBySlug("australia")?.code).toBe("AU");
    expect(getCountryByCode(null)).toBeUndefined();
  });
});

describe("Job Types and Industry Taxonomies", () => {
  it("defines remote-jobs and core job types", () => {
    expect(JOB_TYPES.length).toBeGreaterThanOrEqual(10);
    expect(getJobTypeBySlug("remote-jobs")).toBeDefined();
    expect(getJobTypeBySlug("visa-sponsorship-jobs")).toBeDefined();
  });

  it("defines tech and healthcare industries", () => {
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(15);
    expect(getIndustryBySlug("technology")).toBeDefined();
    expect(getIndustryBySlug("healthcare-medical")).toBeDefined();
  });
});
